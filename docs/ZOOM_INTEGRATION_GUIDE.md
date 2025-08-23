# 🎯 Centrinote Zoom Integration Guide

A comprehensive guide for the Zoom SDK authentication, meeting interface, and N8N webhook integration system.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Authentication Methods](#authentication-methods)
5. [Meeting Management](#meeting-management)
6. [N8N Webhook Integration](#n8n-webhook-integration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## 🎯 Overview

The Centrinote Zoom Integration provides:

- **Dual Authentication**: Support for both Zoom Web SDK and OAuth 2.0 authentication
- **Meeting Management**: Create, join, and manage Zoom meetings with advanced features
- **N8N Integration**: Automated workflows for meeting processing, recording transcription, and notifications
- **SDK Integration**: Embedded Zoom meetings directly in the web application
- **Webhook Processing**: Real-time event handling for meeting lifecycle events

### Key Features

- ✅ Secure SDK signature generation via Supabase Edge Functions
- ✅ Real-time meeting participant tracking
- ✅ Automatic recording processing and transcription
- ✅ AI-powered meeting summaries and action items
- ✅ Email notifications and automated workflows
- ✅ Comprehensive testing suite
- ✅ Detailed webhook logging and monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Centrinote Frontend                       │
├─────────────────────────────────────────────────────────────┤
│  ZoomManager  │  ZoomSDK   │  N8NService  │  WebhookTest   │
│  Component    │  Component │              │  Component     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Backend                          │
├─────────────────────────────────────────────────────────────┤
│  • zoom-sdk-signature Edge Function                        │
│  • zoom-webhook-handler Edge Function                      │
│  • Database Tables (meetings, participants, recordings)    │
│  • Real-time subscriptions                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      N8N Workflows                         │
├─────────────────────────────────────────────────────────────┤
│  • Meeting Event Processing                                 │
│  • Recording Download & Transcription                      │
│  • AI Summary Generation                                    │
│  • Email Notifications                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                        │
├─────────────────────────────────────────────────────────────┤
│  • Zoom API & SDK                                          │
│  • OpenAI API (for transcription & summaries)             │
│  • Email Service Provider                                  │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Setup & Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Zoom SDK Configuration
VITE_ZOOM_SDK_KEY=your_zoom_sdk_key
VITE_ZOOM_SDK_SECRET=your_zoom_sdk_secret

# Zoom OAuth Configuration (optional)
VITE_ZOOM_CLIENT_ID=your_zoom_client_id
VITE_ZOOM_CLIENT_SECRET=your_zoom_client_secret
VITE_ZOOM_REDIRECT_URI=https://your-domain.com/auth/zoom/callback

# N8N Webhook Configuration
VITE_N8N_WEBHOOK_BASE_URL=https://your-n8n-instance.com
VITE_N8N_API_KEY=your_n8n_api_key

# Supabase Configuration (should already be set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Edge Functions Environment

Set these in your Supabase project settings:

```env
ZOOM_SDK_KEY=your_zoom_sdk_key
ZOOM_SDK_SECRET=your_zoom_sdk_secret
ZOOM_WEBHOOK_SECRET_TOKEN=your_zoom_webhook_secret
N8N_ZOOM_WEBHOOK_URL=https://your-n8n-instance.com/webhook/zoom-events
```

### Database Setup

Run the Supabase migrations:

```bash
# Apply Zoom integration tables
supabase db push

# Or apply specific migrations
supabase migration up --file 20250806020000_create_zoom_integration_tables.sql
supabase migration up --file 20250806030000_create_webhook_logs_table.sql
```

### Deploy Supabase Edge Functions

```bash
# Deploy the Zoom SDK signature function
supabase functions deploy zoom-sdk-signature

# Deploy the Zoom webhook handler
supabase functions deploy zoom-webhook-handler
```

## 🔐 Authentication Methods

### 1. Zoom Web SDK Authentication

The preferred method for embedded meetings:

```typescript
import { ZoomSDKAuth } from '../services/zoom/zoomSDKAuth';

const sdkAuth = new ZoomSDKAuth();

// Authenticate user (creates popup form)
const result = await sdkAuth.authenticate();

if (result.success) {
  console.log('User authenticated:', result.user);
}
```

**Benefits:**
- No OAuth configuration required
- Simpler setup process
- Embedded meeting experience
- Real-time meeting controls

### 2. OAuth 2.0 Authentication

For full API access:

```typescript
import { zoomService } from '../services/zoomService';

// Authenticate with OAuth
const result = await zoomService.authenticateUser('oauth');

if (result.success) {
  console.log('OAuth authentication successful');
}
```

**Benefits:**
- Full Zoom API access
- Token refresh capabilities
- Advanced meeting management
- Enterprise features

## 📹 Meeting Management

### Creating Meetings

```typescript
import { zoomService } from '../services/zoomService';

const meetingData = {
  title: 'Team Standup',
  description: 'Daily team meeting',
  start_time: '2024-08-06T14:00:00Z',
  duration: 30,
  timezone: 'Europe/Paris',
  password: 'secure123',
  participants: ['user@example.com'],
  host_video: true,
  participant_video: true,
  waiting_room: true
};

const meeting = await zoomService.createMeeting(userId, meetingData);
```

### Joining Meetings with SDK

```jsx
import { ZoomMeetingSDK } from '../components/zoom/ZoomMeetingSDK';

<ZoomMeetingSDK
  meetingNumber="123456789"
  userName="John Doe"
  userEmail="john@example.com"
  passWord="meeting-password"
  role="0" // 0 = participant, 1 = host
  onMeetingEnd={() => console.log('Meeting ended')}
  onMeetingError={(error) => console.error('Meeting error:', error)}
/>
```

### Meeting Event Handling

The system automatically handles:

- **Meeting Started**: Updates database, triggers N8N workflows
- **Meeting Ended**: Processes recordings, generates summaries
- **Participant Events**: Tracks join/leave times, duration
- **Recording Available**: Downloads and processes recordings

## 🔗 N8N Webhook Integration

### Webhook Endpoints

The integration provides several N8N webhook endpoints:

1. **zoom-events**: General Zoom webhook events
2. **meeting-automation**: Meeting lifecycle automation
3. **recording-processing**: Recording download and transcription
4. **ai-processing**: AI-powered content analysis
5. **email-notifications**: Automated email sending

### Sending Webhooks

```typescript
import { n8nWebhookService } from '../services/n8nWebhookService';

// Send meeting event
await n8nWebhookService.sendZoomWebhook('meeting.ended', {
  meetingId: 'uuid',
  participants: ['user1', 'user2'],
  duration: 1800,
  recording_available: true
});

// Send recording processing request
await n8nWebhookService.sendRecordingWebhook('process_recording', {
  recordingId: 'uuid',
  downloadUrl: 'https://zoom.us/recording/download/...',
  fileType: 'mp4'
}, meetingData);

// Send AI processing request
await n8nWebhookService.sendAIProcessingWebhook('generate_summary', {
  transcript: 'Meeting transcript text...',
  participants: ['John', 'Jane'],
  duration: 30
});
```

### N8N Workflow Templates

Example N8N workflow for processing meeting recordings:

```json
{
  "name": "Centrinote - Recording Processor",
  "nodes": [
    {
      "name": "Webhook",
      "type": "webhook",
      "parameters": {
        "path": "recording-processing",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Download Recording",
      "type": "httpRequest",
      "parameters": {
        "method": "GET",
        "url": "={{ $json.data.recording.download_url }}"
      }
    },
    {
      "name": "Transcribe Audio",
      "type": "openai",
      "parameters": {
        "operation": "transcribe",
        "model": "whisper-1"
      }
    },
    {
      "name": "Generate Summary",
      "type": "openai",
      "parameters": {
        "operation": "chat",
        "model": "gpt-4",
        "messages": [
          {
            "role": "system",
            "content": "Generate a concise meeting summary with key points and action items."
          }
        ]
      }
    }
  ]
}
```

## 🧪 Testing

### Running the Test Suite

```jsx
import { ZoomIntegrationTest } from '../components/zoom/ZoomIntegrationTest';

// Add to your app for testing
<ZoomIntegrationTest />
```

The test suite covers:

- **Authentication Tests**: SDK signature generation, OAuth flow
- **SDK Integration Tests**: Zoom SDK initialization and configuration
- **N8N Webhook Tests**: Connectivity and payload validation
- **Meeting Management Tests**: CRUD operations and status updates

### Manual Testing

1. **Authentication Test**:
   ```bash
   # Check if user is authenticated
   curl -X POST https://your-supabase-url.com/functions/v1/zoom-sdk-signature \
     -H "Authorization: Bearer your-jwt-token" \
     -H "Content-Type: application/json" \
     -d '{"meetingNumber": "123456789", "role": "0"}'
   ```

2. **Webhook Test**:
   ```bash
   # Test N8N webhook connectivity
   curl -X POST https://your-n8n-instance.com/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"event": "test", "timestamp": "2024-08-06T12:00:00Z"}'
   ```

## 🔧 Troubleshooting

### Common Issues

1. **SDK Signature Generation Fails**
   - Check `ZOOM_SDK_KEY` and `ZOOM_SDK_SECRET` in Supabase edge function
   - Verify user is authenticated with Supabase
   - Check function logs in Supabase dashboard

2. **Meeting Join Fails**
   - Verify Zoom SDK is properly loaded
   - Check meeting number and signature validity
   - Ensure user has meeting permissions

3. **Webhooks Not Received**
   - Verify N8N webhook URL configuration
   - Check webhook logs in database
   - Test N8N connectivity manually

4. **Recording Processing Fails**
   - Check recording download URL expiration
   - Verify N8N workflow is active
   - Check OpenAI API limits and keys

### Debug Information

Enable debug logging:

```typescript
// Enable verbose logging
localStorage.setItem('zoom_debug', 'true');

// Check webhook logs
const logs = await supabase
  .from('webhook_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

### Performance Optimization

1. **Database Queries**:
   - Use indexes for frequent queries
   - Implement pagination for large datasets
   - Clean up old webhook logs regularly

2. **Webhook Processing**:
   - Implement retry mechanisms
   - Use queue systems for heavy processing
   - Cache frequently accessed data

## 📚 API Reference

### ZoomService

```typescript
class ZoomService {
  // Authentication
  authenticateUser(method: 'sdk' | 'oauth'): Promise<ZoomAuthResult>
  disconnectUser(userId: string, method: 'sdk' | 'oauth'): Promise<boolean>
  isUserAuthenticated(userId: string): Promise<boolean>
  
  // Meeting Management
  createMeeting(userId: string, meetingData: MeetingFormData): Promise<Meeting>
  getUserMeetings(userId: string): Promise<Meeting[]>
  updateMeetingStatus(meetingId: string, status: string): Promise<boolean>
  deleteMeeting(meetingId: string): Promise<boolean>
  
  // Webhooks
  processWebhook(payload: any): Promise<boolean>
  triggerN8NWorkflow(meetingId: string, event: string, data: any): Promise<boolean>
  
  // Statistics
  getIntegrationStats(userId: string): Promise<any>
  testConnection(userId: string): Promise<{success: boolean, message: string}>
}
```

### N8NWebhookService

```typescript
class N8NWebhookService {
  // Webhook Methods
  sendZoomWebhook(event: string, data: any, meetingId?: string): Promise<N8NWebhookResponse>
  sendMeetingAutomationWebhook(action: string, meetingData: any): Promise<N8NWebhookResponse>
  sendRecordingWebhook(action: string, recordingData: any, meetingData?: any): Promise<N8NWebhookResponse>
  sendAIProcessingWebhook(task: string, data: any): Promise<N8NWebhookResponse>
  sendEmailWebhook(emailType: string, data: any): Promise<N8NWebhookResponse>
  
  // Configuration
  testWebhookConnectivity(): Promise<N8NWebhookResponse>
  getWebhookStatus(): Promise<{configured: boolean, baseUrl: string, endpoints: string[]}>
  createWorkflowTemplates(): Promise<any>
}
```

### Database Schema

Key tables:

- `user_zoom_integrations`: User authentication data
- `meetings`: Meeting information and status
- `meeting_participants`: Participant tracking
- `meeting_summaries`: AI-generated summaries
- `meeting_recordings`: Recording metadata
- `webhook_logs`: Webhook event tracking

## 🚀 Production Deployment

### Checklist

- [ ] Environment variables configured in Supabase
- [ ] Edge functions deployed and tested
- [ ] Database migrations applied
- [ ] N8N workflows created and activated
- [ ] Webhook endpoints tested
- [ ] SSL certificates configured
- [ ] Rate limiting implemented
- [ ] Monitoring and alerting set up

### Security Considerations

1. **Token Security**: Never expose SDK secrets in client-side code
2. **Webhook Verification**: Always verify webhook signatures
3. **Rate Limiting**: Implement rate limiting for webhook endpoints
4. **Data Privacy**: Encrypt sensitive meeting data
5. **Access Control**: Use RLS policies for data access

### Monitoring

Set up monitoring for:

- Webhook success/failure rates
- Meeting creation and join success rates
- Recording processing completion
- N8N workflow execution times
- Database performance metrics

---

## 📞 Support

For technical support:

1. Check the troubleshooting section
2. Review webhook logs in the database
3. Test individual components using the test suite
4. Check Supabase function logs
5. Verify N8N workflow execution

## 📄 License

This integration is part of the Centrinote project and follows the same licensing terms.

---

*Last updated: August 6, 2024*