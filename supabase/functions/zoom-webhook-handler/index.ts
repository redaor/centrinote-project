import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ZoomWebhookPayload {
  event: string;
  event_ts: number;
  payload: {
    account_id: string;
    object: {
      uuid: string;
      id: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      timezone: string;
      duration: number;
      participants?: any[];
      recording_files?: any[];
    };
  };
}

/**
 * Verify Zoom webhook signature
 */
function verifyZoomWebhook(payload: string, signature: string, secretToken: string): boolean {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `v0:${timestamp}:${payload}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretToken);
    const messageData = encoder.encode(message);
    
    return crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => 
      crypto.subtle.sign('HMAC', key, messageData)
    ).then(signatureBuffer => {
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return `v0=${computedSignature}` === signature;
    }).catch(() => false);
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Process Zoom webhook event
 */
async function processZoomWebhook(
  supabaseClient: any,
  payload: ZoomWebhookPayload
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`📥 Processing Zoom webhook: ${payload.event}`);
    
    const { event, payload: zoomPayload } = payload;
    const meetingObject = zoomPayload.object;

    // Find meeting in database
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .select('*')
      .eq('zoom_meeting_id', meetingObject.id)
      .single();

    if (meetingError && meetingError.code !== 'PGRST116') {
      console.error('❌ Error finding meeting:', meetingError);
      return { success: false, error: 'Database error' };
    }

    // Process different event types
    let updateData: any = {};
    let shouldTriggerN8N = true;

    switch (event) {
      case 'meeting.started':
        updateData = {
          status: 'started',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        break;

      case 'meeting.ended':
        updateData = {
          status: 'ended',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        break;

      case 'meeting.participant_joined':
        if (meeting && meetingObject.participants?.[0]) {
          const participant = meetingObject.participants[0];
          await supabaseClient
            .from('meeting_participants')
            .upsert({
              meeting_id: meeting.id,
              zoom_participant_id: participant.id,
              email: participant.email || participant.user_name || 'unknown@example.com',
              display_name: participant.user_name || 'Unknown User',
              joined_at: new Date(participant.join_time || Date.now()).toISOString(),
              is_host: participant.user_id === meetingObject.host_id,
              is_co_host: false,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'meeting_id,email'
            });
        }
        break;

      case 'meeting.participant_left':
        if (meeting && meetingObject.participants?.[0]) {
          const participant = meetingObject.participants[0];
          const joinTime = new Date(participant.join_time);
          const leaveTime = new Date(participant.leave_time);
          const durationMinutes = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60));

          await supabaseClient
            .from('meeting_participants')
            .update({
              left_at: leaveTime.toISOString(),
              duration_minutes: durationMinutes,
              updated_at: new Date().toISOString()
            })
            .eq('meeting_id', meeting.id)
            .eq('email', participant.email || participant.user_name || 'unknown@example.com');
        }
        break;

      case 'recording.completed':
        if (meeting && meetingObject.recording_files) {
          // Store recording information
          for (const file of meetingObject.recording_files) {
            await supabaseClient
              .from('meeting_recordings')
              .upsert({
                meeting_id: meeting.id,
                zoom_recording_id: file.id,
                recording_type: file.recording_type,
                file_type: file.file_type,
                file_size: file.file_size,
                download_url: file.download_url,
                download_url_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                downloaded: false,
                processed_for_transcription: false,
                transcription_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'zoom_recording_id'
              });
          }

          updateData = {
            has_recording: true,
            updated_at: new Date().toISOString()
          };
        }
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event}`);
        shouldTriggerN8N = false;
    }

    // Update meeting if needed
    if (meeting && Object.keys(updateData).length > 0) {
      // Add webhook event to history
      const currentEvents = meeting.webhook_events || [];
      const newEvent = {
        event_type: event,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const updatedEvents = [...currentEvents, newEvent];

      await supabaseClient
        .from('meetings')
        .update({
          ...updateData,
          webhook_events: updatedEvents,
          last_webhook_at: new Date().toISOString()
        })
        .eq('id', meeting.id);
    }

    // Forward to N8N if configured
    if (shouldTriggerN8N) {
      const n8nResult = await forwardToN8N(payload, meeting);
      if (!n8nResult.success) {
        console.warn('⚠️ N8N forwarding failed:', n8nResult.error);
      }
    }

    return { 
      success: true, 
      message: `Webhook ${event} processed successfully` 
    };

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Forward webhook to N8N
 */
async function forwardToN8N(
  payload: ZoomWebhookPayload, 
  meeting: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const n8nUrl = Deno.env.get('N8N_ZOOM_WEBHOOK_URL') || 'https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75';
    if (!n8nUrl) {
      console.log('ℹ️ N8N webhook URL not configured, skipping forward');
      return { success: true };
    }

    const n8nPayload = {
      source: 'centrinote_zoom_webhook',
      event: payload.event,
      timestamp: new Date(payload.event_ts * 1000).toISOString(),
      zoom_data: payload.payload,
      meeting_id: meeting?.id,
      meeting_data: meeting ? {
        id: meeting.id,
        user_id: meeting.user_id,
        title: meeting.title,
        status: meeting.status,
        start_time: meeting.start_time,
        duration: meeting.duration
      } : null,
      environment: {
        source: 'supabase_edge_function',
        function_name: 'zoom-webhook-handler',
        timestamp: new Date().toISOString()
      }
    };

    console.log('🔄 Forwarding to N8N:', n8nUrl);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Centrinote-Supabase-Function/1.0',
        'X-Source': 'centrinote-zoom-webhook'
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N responded with ${response.status}: ${errorText}`);
    }

    console.log('✅ Successfully forwarded to N8N');
    return { success: true };

  } catch (error) {
    console.error('❌ Error forwarding to N8N:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'N8N forwarding failed' 
    };
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

    // Get request body
    const requestBody = await req.text();
    const payload: ZoomWebhookPayload = JSON.parse(requestBody);

    console.log('📥 Received Zoom webhook:', payload.event);

    // Verify webhook signature (if secret token is configured)
    const zoomSignature = req.headers.get('x-zm-signature');
    const secretToken = Deno.env.get('ZOOM_WEBHOOK_SECRET_TOKEN');
    
    if (secretToken && zoomSignature) {
      const isValid = await verifyZoomWebhook(requestBody, zoomSignature, secretToken);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process webhook
    const result = await processZoomWebhook(supabaseClient, payload);

    if (result.success) {
      console.log('✅ Webhook processed successfully:', result.message);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: result.message 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('❌ Webhook processing failed:', result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    
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