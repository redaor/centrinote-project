import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, verify } from 'https://deno.land/x/djwt@v2.9.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MeetingCreateRequest {
  userId: string;
  meetingConfig: {
    topic: string;
    type?: 1 | 2 | 8; // 1 = instant, 2 = scheduled, 8 = recurring
    start_time?: string;
    duration?: number;
    password?: string;
    agenda?: string;
    settings?: {
      host_video?: boolean;
      participant_video?: boolean;
      waiting_room?: boolean;
      mute_upon_entry?: boolean;
      auto_recording?: 'none' | 'local' | 'cloud';
    };
  };
}

/**
 * Generate JWT token for Zoom API
 */
function generateZoomJWT(apiKey: string, apiSecret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: apiKey,
    alg: 'HS256',
    exp: now + 3600, // 1 hour
    iat: now,
    aud: 'zoom',
    appKey: apiKey,
    tokenExp: now + 3600,
    grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
  };

  const key = new TextEncoder().encode(apiSecret);
  
  return create({ alg: "HS256", typ: "JWT" }, payload, key);
}

/**
 * Create meeting via Zoom API
 */
async function createZoomMeeting(jwtToken: string, meetingConfig: any): Promise<any> {
  try {
    console.log('📅 Creating Zoom meeting via API');

    const requestBody = {
      topic: meetingConfig.topic,
      type: meetingConfig.type || 2, // Scheduled meeting
      start_time: meetingConfig.start_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      duration: meetingConfig.duration || 60,
      password: meetingConfig.password,
      agenda: meetingConfig.agenda || '',
      settings: {
        host_video: meetingConfig.settings?.host_video ?? true,
        participant_video: meetingConfig.settings?.participant_video ?? true,
        cn_meeting: false, // Chinese meeting
        in_meeting: false, // Indian meeting
        join_before_host: false,
        mute_upon_entry: meetingConfig.settings?.mute_upon_entry ?? false,
        watermark: false,
        use_pmi: false,
        approval_type: 2, // No registration required
        audio: 'both', // Telephone and VoIP
        auto_recording: meetingConfig.settings?.auto_recording || 'none',
        enforce_login: false,
        registrants_email_notification: false,
        waiting_room: meetingConfig.settings?.waiting_room ?? true,
        allow_multiple_devices: true
      }
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Zoom API error:', errorData);
      throw new Error(`Zoom API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const meetingData = await response.json();
    console.log('✅ Meeting created successfully:', meetingData.id);

    return meetingData;
  } catch (error) {
    console.error('❌ Error creating meeting:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, meetingConfig }: MeetingCreateRequest = await req.json();

    if (!userId || !meetingConfig || !meetingConfig.topic) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, meetingConfig.topic' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the request
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Zoom JWT credentials from environment
    const apiKey = Deno.env.get('ZOOM_API_KEY');
    const apiSecret = Deno.env.get('ZOOM_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing Zoom API credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    console.log('🔐 Generating JWT token for Zoom API');
    const jwtToken = await generateZoomJWT(apiKey, apiSecret);

    // Create meeting via Zoom API
    const meeting = await createZoomMeeting(jwtToken, meetingConfig);

    // Store meeting in database using service role
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabaseService
      .from('zoom_meetings')
      .insert({
        user_id: userId,
        meeting_id: meeting.id.toString(),
        meeting_number: meeting.id.toString(),
        topic: meeting.topic,
        start_time: meeting.start_time,
        duration: meeting.duration,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
        status: 'scheduled',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Don't fail the whole request, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        meeting: {
          id: meeting.id,
          topic: meeting.topic,
          start_time: meeting.start_time,
          duration: meeting.duration,
          join_url: meeting.join_url,
          start_url: meeting.start_url,
          password: meeting.password,
          meeting_number: meeting.id.toString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Meeting creation error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});