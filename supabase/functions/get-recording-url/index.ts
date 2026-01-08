/**
 * 🎬 Supabase Edge Function pour récupérer l'URL d'enregistrement Daily.co
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

interface DailyRecording {
  id: string;
  room_name: string;
  start_ts: number;
  status: 'recording' | 'finished' | 'error';
  duration: number;
  max_participants: number;
  s3_key?: string;
}

interface DailyRecordingsResponse {
  total_count: number;
  data: DailyRecording[];
}

interface DailyAccessLinkResponse {
  download_link: string;
  expires: number;
}

serve(async (req) => {
  console.log('[GET-RECORDING-URL] Function called');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Accept POST (supabase.functions.invoke uses POST by default)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Get parameters from body
    const body = await req.json();
    const { roomName, recordingId } = body;

    if (!roomName && !recordingId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameter: roomName or recordingId'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get Daily.co API key from environment
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');
    if (!dailyApiKey) {
      console.error('[GET-RECORDING-URL] DAILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    let targetRecordingId: string | null = recordingId || null;

    // If roomName provided, find the recording by room name
    if (roomName && !recordingId) {
      console.log('[GET-RECORDING-URL] Fetching recordings for room:', roomName);

      const recordingsResponse = await fetch(
        `https://api.daily.co/v1/recordings?room_name=${encodeURIComponent(roomName)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${dailyApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!recordingsResponse.ok) {
        const errorText = await recordingsResponse.text();
        console.error('[GET-RECORDING-URL] Failed to fetch recordings:', errorText);
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch recordings from Daily.co',
            details: errorText
          }),
          { status: recordingsResponse.status, headers: corsHeaders }
        );
      }

      const recordingsData: DailyRecordingsResponse = await recordingsResponse.json();
      console.log('[GET-RECORDING-URL] Recordings found:', recordingsData.total_count);

      // Find first "finished" recording
      const finishedRecording = recordingsData.data.find(r => r.status === 'finished');

      if (!finishedRecording) {
        console.log('[GET-RECORDING-URL] No finished recording found yet');
        return new Response(
          JSON.stringify({
            error: 'No finished recording found',
            message: 'Recording is still processing. Please retry in a few seconds.',
            totalRecordings: recordingsData.total_count,
            recordings: recordingsData.data.map(r => ({
              id: r.id,
              status: r.status,
              duration: r.duration
            }))
          }),
          { status: 404, headers: corsHeaders }
        );
      }

      targetRecordingId = finishedRecording.id;
      console.log('[GET-RECORDING-URL] Found finished recording:', targetRecordingId);
    }

    if (!targetRecordingId) {
      return new Response(
        JSON.stringify({ error: 'Recording not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get access link for the recording
    console.log('[GET-RECORDING-URL] Fetching access link for:', targetRecordingId);

    const accessLinkResponse = await fetch(
      `https://api.daily.co/v1/recordings/${targetRecordingId}/access-link`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${dailyApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!accessLinkResponse.ok) {
      const errorText = await accessLinkResponse.text();
      console.error('[GET-RECORDING-URL] Failed to get access link:', errorText);

      // 404 = recording deleted or not available
      if (accessLinkResponse.status === 404) {
        return new Response(
          JSON.stringify({
            error: 'Recording not available',
            message: 'Recording may have been deleted or is not accessible'
          }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to get access link from Daily.co',
          details: errorText
        }),
        { status: accessLinkResponse.status, headers: corsHeaders }
      );
    }

    const accessLinkData: DailyAccessLinkResponse = await accessLinkResponse.json();
    console.log('[GET-RECORDING-URL] Access link retrieved successfully');

    // Return success with download URL
    return new Response(
      JSON.stringify({
        success: true,
        recordingId: targetRecordingId,
        downloadUrl: accessLinkData.download_link,
        expiresAt: accessLinkData.expires,
        expiresAtDate: new Date(accessLinkData.expires * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );

  } catch (error) {
    console.error('[GET-RECORDING-URL] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});




