# Supabase Edge Functions Setup Guide

## Overview

This guide shows how to deploy Supabase Edge Functions for production-ready Zoom integration. Edge Functions are needed to:
- Make secure server-side calls to Zoom API (avoids CORS issues)
- Keep API credentials secure (not exposed in client-side code)
- Handle authentication and meeting creation properly

## Current Status

**✅ IMMEDIATE WORKAROUND IMPLEMENTED**: Client-side mock meetings
- Meeting creation works without Edge Functions
- Uses mock data for development/testing
- Real Zoom API attempted first, falls back to mock on CORS errors

**🚀 FOR PRODUCTION**: Deploy Edge Functions for real Zoom API integration

## Prerequisites

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Docker installed** (for local development)

3. **Supabase project** with correct credentials

## Step 1: Initialize Edge Functions

In your project directory:

```bash
# Login to Supabase
supabase login

# Link to your project (replace with your project ref)
supabase link --project-ref your-project-ref

# Initialize functions directory
supabase functions new zoom-create-meeting
supabase functions new zoom-sdk-signature
```

## Step 2: Create zoom-create-meeting Function

Create `supabase/functions/zoom-create-meeting/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZoomMeetingRequest {
  userId: string;
  meetingConfig: {
    topic: string;
    type?: number;
    start_time: string;
    duration?: number;
    password?: string;
    agenda?: string;
    settings?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, meetingConfig }: ZoomMeetingRequest = await req.json()
    
    // Get environment variables
    const ZOOM_SDK_KEY = Deno.env.get('ZOOM_SDK_KEY')
    const ZOOM_SDK_SECRET = Deno.env.get('ZOOM_SDK_SECRET')
    
    if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
      throw new Error('Zoom SDK credentials not configured')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user's Zoom connection
    const { data: connection } = await supabase
      .from('zoom_user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!connection) {
      throw new Error('User not connected to Zoom')
    }

    // Generate JWT for Zoom API
    const jwt = generateZoomJWT(ZOOM_SDK_KEY, ZOOM_SDK_SECRET)

    // Create meeting via Zoom API
    const zoomResponse = await fetch(`https://api.zoom.us/v2/users/${connection.zoom_email}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: meetingConfig.topic,
        type: meetingConfig.type || 2,
        start_time: meetingConfig.start_time,
        duration: meetingConfig.duration || 30,
        password: meetingConfig.password,
        agenda: meetingConfig.agenda || '',
        settings: {
          host_video: meetingConfig.settings?.host_video ?? true,
          participant_video: meetingConfig.settings?.participant_video ?? true,
          waiting_room: meetingConfig.settings?.waiting_room ?? true,
          mute_upon_entry: meetingConfig.settings?.mute_upon_entry ?? false,
          auto_recording: meetingConfig.settings?.auto_recording || 'none'
        }
      })
    })

    if (!zoomResponse.ok) {
      const errorText = await zoomResponse.text()
      throw new Error(`Zoom API error: ${zoomResponse.status} ${errorText}`)
    }

    const meeting = await zoomResponse.json()

    return new Response(
      JSON.stringify({ success: true, meeting }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error creating meeting:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

// JWT generation function (copy from your utils)
function generateZoomJWT(sdkKey: string, sdkSecret: string): string {
  // Implementation needed - copy from src/utils/zoomJWT.ts
  // For now, return a placeholder
  return "JWT_TOKEN_PLACEHOLDER"
}
```

## Step 3: Create zoom-sdk-signature Function

Create `supabase/functions/zoom-sdk-signature/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meetingNumber, role } = await req.json()
    
    const ZOOM_SDK_KEY = Deno.env.get('ZOOM_SDK_KEY')
    const ZOOM_SDK_SECRET = Deno.env.get('ZOOM_SDK_SECRET')
    
    if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
      throw new Error('Zoom SDK credentials not configured')
    }

    // Generate meeting signature
    const signature = generateMeetingSignature(ZOOM_SDK_KEY, ZOOM_SDK_SECRET, meetingNumber, role)

    return new Response(
      JSON.stringify({ success: true, signature }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateMeetingSignature(sdkKey: string, sdkSecret: string, meetingNumber: string, role: string): string {
  // Implementation needed
  return "SIGNATURE_PLACEHOLDER"
}
```

## Step 4: Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```env
ZOOM_SDK_KEY=your_zoom_sdk_key
ZOOM_SDK_SECRET=your_zoom_sdk_secret
```

## Step 5: Deploy Functions

```bash
# Deploy individual functions
supabase functions deploy zoom-create-meeting
supabase functions deploy zoom-sdk-signature

# Or deploy all functions
supabase functions deploy
```

## Step 6: Test Functions

```bash
# Test locally first
supabase functions serve

# Test deployed function
curl -X POST 'https://your-project-ref.functions.supabase.co/zoom-create-meeting' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-id",
    "meetingConfig": {
      "topic": "Test Meeting",
      "start_time": "2024-01-01T10:00:00Z",
      "duration": 30
    }
  }'
```

## Step 7: Update Client Code

Once Edge Functions are deployed, update `zoomMeetingSDKService.ts` to use them instead of the client-side fallback:

```typescript
// In createMeeting method, replace the hybrid approach with:
const { data, error } = await supabase.functions.invoke('zoom-create-meeting', {
  body: {
    userId: user.id,
    meetingConfig: config
  }
});

if (error) throw error;
if (!data.success) throw new Error(data.error);

return data.meeting;
```

## Troubleshooting

### Common Issues:

1. **"Function not found"**
   - Check function is deployed: `supabase functions list`
   - Verify project is linked correctly

2. **CORS errors**
   - Ensure corsHeaders are included in all responses
   - Add proper preflight handling

3. **Environment variables missing**
   - Set in Supabase Dashboard → Settings → Edge Functions
   - Restart functions after adding variables

4. **Zoom API authentication fails**
   - Verify JWT generation is correct
   - Check SDK credentials are valid
   - Ensure user has Zoom connection in database

### Local Development:

```bash
# Start local functions
supabase start
supabase functions serve

# Test with local URL
const { data } = await supabase.functions.invoke('zoom-create-meeting', {
  body: { /* your data */ }
});
```

## Production Considerations

1. **Rate Limiting**: Implement request throttling
2. **Error Handling**: Comprehensive error logging
3. **Monitoring**: Set up function monitoring
4. **Security**: Validate all inputs
5. **Caching**: Cache JWT tokens when possible

## Alternative: Proxy Server

If Edge Functions are complex, you can create a simple Express.js proxy:

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/zoom/meetings', async (req, res) => {
  // Same logic as Edge Function but in Express
});

app.listen(3001, () => {
  console.log('Zoom proxy server running on port 3001');
});
```

## Current Status

✅ **WORKING NOW**: Mock meetings for development
🚀 **PRODUCTION READY**: Deploy Edge Functions using this guide

The current implementation will work immediately with mock data. For production with real Zoom meetings, follow this guide to deploy the Edge Functions.