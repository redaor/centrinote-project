import { supabase } from '../lib/supabase';

interface N8NWebhookPayload {
  source: string;
  event: string;
  timestamp: string;
  data: any;
  meetingId?: string;
  userId?: string;
}

interface N8NWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class N8NWebhookService {
  private readonly baseUrl: string;
  private readonly zoomWebhookUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL || 'https://n8n.srv886297.hstgr.cloud';
    this.zoomWebhookUrl = 'https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Centrinote-Zoom-Integration/1.0',
      'X-Source': 'centrinote'
    };

    // Add authentication if configured
    const apiKey = import.meta.env.VITE_N8N_API_KEY;
    if (apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  /**
   * Send webhook to N8N for Zoom meeting events
   */
  async sendZoomWebhook(event: string, data: any, meetingId?: string): Promise<N8NWebhookResponse> {
    const payload: N8NWebhookPayload = {
      source: 'centrinote_zoom',
      event,
      timestamp: new Date().toISOString(),
      data,
      meetingId,
      userId: await this.getCurrentUserId()
    };

    return await this.sendDirectWebhook(this.zoomWebhookUrl, payload);
  }

  /**
   * Send webhook to N8N for meeting automation workflows
   */
  async sendMeetingAutomationWebhook(action: string, meetingData: any): Promise<N8NWebhookResponse> {
    const payload: N8NWebhookPayload = {
      source: 'centrinote_automation',
      event: 'meeting_automation',
      timestamp: new Date().toISOString(),
      data: {
        action,
        meeting: meetingData,
        automationConfig: await this.getMeetingAutomationConfig(meetingData.id)
      },
      meetingId: meetingData.id,
      userId: meetingData.user_id
    };

    return await this.sendWebhook('meeting-automation', payload);
  }

  /**
   * Send webhook to N8N for recording processing
   */
  async sendRecordingWebhook(action: string, recordingData: any, meetingData?: any): Promise<N8NWebhookResponse> {
    const payload: N8NWebhookPayload = {
      source: 'centrinote_recording',
      event: 'recording_processing',
      timestamp: new Date().toISOString(),
      data: {
        action,
        recording: recordingData,
        meeting: meetingData,
        processingConfig: {
          transcription: true,
          summarization: true,
          actionItems: true,
          emailNotifications: true
        }
      },
      meetingId: meetingData?.id,
      userId: meetingData?.user_id
    };

    return await this.sendWebhook('recording-processing', payload);
  }

  /**
   * Send webhook to N8N for AI processing tasks
   */
  async sendAIProcessingWebhook(task: string, data: any): Promise<N8NWebhookResponse> {
    const payload: N8NWebhookPayload = {
      source: 'centrinote_ai',
      event: 'ai_processing',
      timestamp: new Date().toISOString(),
      data: {
        task,
        input: data,
        config: {
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 2000
        }
      },
      userId: await this.getCurrentUserId()
    };

    return await this.sendWebhook('ai-processing', payload);
  }

  /**
   * Send webhook to N8N for email notifications
   */
  async sendEmailWebhook(emailType: string, data: any): Promise<N8NWebhookResponse> {
    const payload: N8NWebhookPayload = {
      source: 'centrinote_email',
      event: 'email_notification',
      timestamp: new Date().toISOString(),
      data: {
        emailType,
        ...data,
        template: await this.getEmailTemplate(emailType),
        branding: {
          appName: 'Centrinote',
          logo: `${window.location.origin}/logo.png`,
          primaryColor: '#2D8CFF'
        }
      },
      userId: data.userId || await this.getCurrentUserId()
    };

    return await this.sendWebhook('email-notifications', payload);
  }

  /**
   * Send webhook directly to a specific URL
   */
  private async sendDirectWebhook(url: string, payload: N8NWebhookPayload): Promise<N8NWebhookResponse> {
    try {
      console.log(`📤 Sending webhook to ${url}:`, payload.event);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`❌ Webhook failed (${response.status}):`, responseData);
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseData.message || 'Unknown error'}`,
          data: responseData
        };
      }

      console.log(`✅ Webhook sent successfully to ${url}`);
      
      // Log webhook event
      await this.logWebhookEvent('direct', payload, responseData);

      return {
        success: true,
        message: responseData.message || 'Webhook sent successfully',
        data: responseData
      };

    } catch (error) {
      console.error(`❌ Error sending webhook to ${url}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generic webhook sender
   */
  private async sendWebhook(endpoint: string, payload: N8NWebhookPayload): Promise<N8NWebhookResponse> {
    try {
      console.log(`📤 Sending N8N webhook to ${endpoint}:`, payload.event);

      const url = `${this.baseUrl}/webhook/${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(payload)
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`❌ N8N webhook failed (${response.status}):`, responseData);
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseData.message || 'Unknown error'}`,
          data: responseData
        };
      }

      console.log(`✅ N8N webhook sent successfully to ${endpoint}`);
      
      // Log webhook event
      await this.logWebhookEvent(endpoint, payload, responseData);

      return {
        success: true,
        message: responseData.message || 'Webhook sent successfully',
        data: responseData
      };

    } catch (error) {
      console.error(`❌ Error sending N8N webhook to ${endpoint}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test N8N webhook connectivity
   */
  async testWebhookConnectivity(): Promise<N8NWebhookResponse> {
    const testPayload: N8NWebhookPayload = {
      source: 'centrinote_test',
      event: 'connectivity_test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Test webhook from Centrinote',
        version: '1.0.0',
        features: ['zoom_integration', 'ai_processing', 'email_notifications']
      },
      userId: await this.getCurrentUserId()
    };

    return await this.sendWebhook('test', testPayload);
  }

  /**
   * Get N8N webhook configuration and status
   */
  async getWebhookStatus(): Promise<{
    configured: boolean;
    baseUrl: string;
    endpoints: string[];
    lastTest?: Date;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Check base URL
    if (!this.baseUrl) {
      errors.push('N8N base URL not configured');
    }

    // Check required endpoints
    const requiredEndpoints = [
      'zoom-events',
      'meeting-automation',
      'recording-processing',
      'ai-processing',
      'email-notifications'
    ];

    return {
      configured: errors.length === 0,
      baseUrl: this.baseUrl,
      endpoints: requiredEndpoints,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create N8N workflow templates for Centrinote
   */
  async createWorkflowTemplates(): Promise<any> {
    const templates = {
      zoomEventHandler: {
        name: 'Centrinote - Zoom Event Handler',
        nodes: [
          {
            name: 'Webhook',
            type: 'webhook',
            position: [100, 200],
            parameters: {
              path: 'zoom-events',
              httpMethod: 'POST',
              responseMode: 'onReceived'
            }
          },
          {
            name: 'Switch',
            type: 'switch',
            position: [300, 200],
            parameters: {
              rules: [
                { field: 'event', operation: 'equal', value: 'meeting.started' },
                { field: 'event', operation: 'equal', value: 'meeting.ended' },
                { field: 'event', operation: 'equal', value: 'recording.completed' }
              ]
            }
          },
          {
            name: 'Process Meeting Start',
            type: 'function',
            position: [500, 100],
            parameters: {
              functionCode: `
                // Process meeting start event
                const payload = items[0].json;
                
                return {
                  processed: true,
                  event: 'meeting.started',
                  meetingId: payload.meetingId,
                  timestamp: payload.timestamp,
                  participants: payload.data.participants || []
                };
              `
            }
          }
        ],
        connections: {
          'Webhook': { 'main': [[{ 'node': 'Switch', 'type': 'main', 'index': 0 }]] },
          'Switch': { 'main': [[{ 'node': 'Process Meeting Start', 'type': 'main', 'index': 0 }]] }
        }
      },

      recordingProcessor: {
        name: 'Centrinote - Recording Processor',
        nodes: [
          {
            name: 'Webhook',
            type: 'webhook',
            position: [100, 200],
            parameters: {
              path: 'recording-processing',
              httpMethod: 'POST'
            }
          },
          {
            name: 'Download Recording',
            type: 'httpRequest',
            position: [300, 200],
            parameters: {
              method: 'GET',
              url: '={{ $json.data.recording.download_url }}'
            }
          },
          {
            name: 'Generate Transcript',
            type: 'function',
            position: [500, 200],
            parameters: {
              functionCode: `
                // Integrate with transcription service
                // This would call OpenAI Whisper or similar
                return {
                  transcript: 'Generated transcript...',
                  confidence: 0.95,
                  duration: items[0].json.data.recording.duration
                };
              `
            }
          }
        ]
      }
    };

    return templates;
  }

  /**
   * Get current user ID from Supabase session
   */
  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch (error) {
      console.error('Error getting current user:', error);
      return undefined;
    }
  }

  /**
   * Get meeting automation configuration
   */
  private async getMeetingAutomationConfig(meetingId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, user_zoom_integrations(*)')
        .eq('id', meetingId)
        .single();

      if (error) throw error;

      return {
        autoRecording: true,
        autoTranscription: true,
        autoSummary: true,
        emailNotifications: true,
        webhookEvents: true
      };
    } catch (error) {
      console.error('Error getting automation config:', error);
      return {};
    }
  }

  /**
   * Get email template configuration
   */
  private async getEmailTemplate(emailType: string): Promise<any> {
    const templates = {
      meeting_summary: {
        subject: '📝 Résumé de votre réunion Zoom - {{ meeting.title }}',
        template: 'meeting_summary',
        variables: ['meeting', 'summary', 'actionItems', 'participants']
      },
      recording_ready: {
        subject: '🎬 Enregistrement disponible - {{ meeting.title }}',
        template: 'recording_ready',
        variables: ['meeting', 'recordingUrl', 'transcript']
      },
      meeting_reminder: {
        subject: '⏰ Rappel réunion dans {{ timeUntil }} - {{ meeting.title }}',
        template: 'meeting_reminder',
        variables: ['meeting', 'timeUntil', 'joinUrl']
      }
    };

    return templates[emailType as keyof typeof templates] || {};
  }

  /**
   * Log webhook event for debugging
   */
  private async logWebhookEvent(endpoint: string, payload: N8NWebhookPayload, response: any): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return;

      await supabase
        .from('webhook_logs')
        .insert({
          user_id: userId,
          webhook_type: 'n8n',
          endpoint,
          event_type: payload.event,
          payload: payload,
          response: response,
          success: true,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging webhook event:', error);
    }
  }
}

// Export singleton instance
export const n8nWebhookService = new N8NWebhookService();