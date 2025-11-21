// Version: 1.0.1 - Force redeploy
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface DailyRecording {
  id: string;
  room_name: string;
  start_ts: number;
  status: "recording" | "finished" | "error";
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

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('[GET-RECORDING-URL] Function called');

  // Only GET method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Get query parameters
    const roomName = event.queryStringParameters?.roomName;
    const recordingId = event.queryStringParameters?.recordingId;

    if (!roomName && !recordingId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: roomName or recordingId'
        }),
      };
    }

    // Get Daily.co API key from environment
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      console.error('[GET-RECORDING-URL] DAILY_API_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
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
        return {
          statusCode: recordingsResponse.status,
          body: JSON.stringify({
            error: 'Failed to fetch recordings from Daily.co',
            details: errorText
          }),
        };
      }

      const recordingsData: DailyRecordingsResponse = await recordingsResponse.json();
      console.log('[GET-RECORDING-URL] Recordings found:', recordingsData.total_count);

      // Find first "finished" recording
      const finishedRecording = recordingsData.data.find(r => r.status === 'finished');

      if (!finishedRecording) {
        console.log('[GET-RECORDING-URL] No finished recording found yet');
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: 'No finished recording found',
            message: 'Recording is still processing. Please retry in a few seconds.',
            totalRecordings: recordingsData.total_count,
            recordings: recordingsData.data.map(r => ({
              id: r.id,
              status: r.status,
              duration: r.duration
            }))
          }),
        };
      }

      targetRecordingId = finishedRecording.id;
      console.log('[GET-RECORDING-URL] Found finished recording:', targetRecordingId);
    }

    if (!targetRecordingId) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Recording not found' }),
      };
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
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: 'Recording not available',
            message: 'Recording may have been deleted or is not accessible'
          }),
        };
      }

      return {
        statusCode: accessLinkResponse.status,
        body: JSON.stringify({
          error: 'Failed to get access link from Daily.co',
          details: errorText
        }),
      };
    }

    const accessLinkData: DailyAccessLinkResponse = await accessLinkResponse.json();
    console.log('[GET-RECORDING-URL] Access link retrieved successfully');

    // Return success with download URL
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({
        success: true,
        recordingId: targetRecordingId,
        downloadUrl: accessLinkData.download_link,
        expiresAt: accessLinkData.expires,
        expiresAtDate: new Date(accessLinkData.expires * 1000).toISOString(),
      }),
    };

  } catch (error) {
    console.error('[GET-RECORDING-URL] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
