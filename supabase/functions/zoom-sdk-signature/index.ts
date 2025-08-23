import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ZoomSDKSignatureRequest {
  meetingNumber: string;
  role: string;
}

async function generateSignature(apiKey: string, apiSecret: string, meetingNumber: string, role: string): Promise<string> {
  const timestamp = Date.now() - 30000; // 30 seconds before current time
  const msg = `${apiKey}${meetingNumber}${timestamp}${role}`;
  
  try {
    // Create HMAC-SHA256 signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
    const signatureArray = new Uint8Array(signature);
    
    // Convert to hex string
    const signatureHex = Array.from(signatureArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Create the final signature in the format Zoom expects
    const finalSignature = `${apiKey}.${meetingNumber}.${timestamp}.${role}.${signatureHex}`;
    
    return encode(new TextEncoder().encode(finalSignature));
  } catch (error) {
    console.error('❌ Error generating signature:', error);
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
    const { meetingNumber, role }: ZoomSDKSignatureRequest = await req.json();

    if (!meetingNumber || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: meetingNumber, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Zoom SDK credentials from environment
    const apiKey = Deno.env.get('ZOOM_SDK_KEY');
    const apiSecret = Deno.env.get('ZOOM_SDK_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('❌ Missing Zoom SDK credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['0', '1']; // 0 = participant, 1 = host
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be "0" (participant) or "1" (host)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signature
    console.log('🔐 Generating Zoom SDK signature for meeting:', meetingNumber);
    
    const signature = await generateSignature(apiKey, apiSecret, meetingNumber, role);

    // Log for debugging (remove in production)
    console.log('✅ Signature generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        apiKey,
        timestamp: Date.now(),
        meetingNumber,
        role
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error generating Zoom SDK signature:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});