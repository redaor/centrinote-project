// 🎯 Service de routing intelligent pour webhooks n8n
// Route les événements vers le bon workflow selon leur type

interface WebhookRouterConfig {
  primaryEventsUrl: string;    // centrinote-events (tous événements)
  recordingUrl: string;        // jitsi-recording (recording seulement)
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  source: string;
  shouldSendEmail?: boolean;
}

export class WebhookRouter {
  private config: WebhookRouterConfig;
  
  // Événements qui déclenchent des emails
  private readonly EMAIL_EVENTS = new Set([
    'recording_started',
    'recording_stopped'
  ]);

  // Événements de tracking (pas d'email, juste analytics)
  private readonly TRACKING_EVENTS = new Set([
    'room_created',
    'room_joined',
    'session_started', 
    'session_ended',
    'participant_joined',
    'participant_left'
  ]);

  constructor() {
    this.config = {
      primaryEventsUrl: import.meta.env.VITE_N8N_CENTRINOTE_EVENTS,
      recordingUrl: import.meta.env.VITE_N8N_JITSI_RECORDING
    };
    
    console.log('🔧 [DEBUG] WebhookRouter config:', this.config);

    // Validation des URLs
    if (!this.config.primaryEventsUrl) {
      console.warn('⚠️ VITE_N8N_CENTRINOTE_EVENTS non configurée');
    }
    if (!this.config.recordingUrl) {
      console.warn('⚠️ VITE_N8N_JITSI_RECORDING non configurée');
    }
  }

  /**
   * 🎯 Route un événement vers le(s) bon(s) workflow(s) n8n
   */
  async routeEvent(
    event: string,
    data: any,
    options: {
      forceEmail?: boolean;
      skipDebounce?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    results: Array<{
      webhook: 'primary' | 'recording';
      success: boolean;
      workflowId?: string;
      error?: string;
    }>;
    error?: string;
  }> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      source: 'centrinote_jitsi',
      shouldSendEmail: options.forceEmail || this.EMAIL_EVENTS.has(event)
    };

    console.log(`🎯 [ROUTER] Routing événement "${event}" vers workflows n8n...`);
    console.log('📡 [DEBUG] FINAL JSON PAYLOAD TO N8N:', JSON.stringify(payload, null, 2));

    const results: Array<{
      webhook: 'primary' | 'recording';
      success: boolean;
      workflowId?: string;
      error?: string;
    }> = [];

    // 📡 TOUJOURS envoyer vers le workflow principal (centrinote-events)
    // Il fait le routing intelligent côté n8n
    if (this.config.primaryEventsUrl) {
      try {
        const primaryResult = await this.sendToWebhook(
          this.config.primaryEventsUrl,
          payload,
          'primary'
        );
        results.push(primaryResult);
        console.log(`✅ [ROUTER] Événement "${event}" envoyé vers centrinote-events`);
      } catch (error) {
        const errorResult = {
          webhook: 'primary' as const,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
        results.push(errorResult);
        console.error(`❌ [ROUTER] Erreur centrinote-events pour "${event}":`, error);
      }
    }

    // 📧 AUSSI envoyer vers recording workflow SI c'est un événement recording
    // (Double sécurité pour les emails critiques)
    if (this.EMAIL_EVENTS.has(event) && this.config.recordingUrl) {
      try {
        const recordingResult = await this.sendToWebhook(
          this.config.recordingUrl,
          {
            ...payload,
            shouldSendEmail: true // Force email pour recording
          },
          'recording'
        );
        results.push(recordingResult);
        console.log(`📧 [ROUTER] Événement recording "${event}" envoyé vers jitsi-recording`);
      } catch (error) {
        const errorResult = {
          webhook: 'recording' as const,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
        results.push(errorResult);
        console.error(`❌ [ROUTER] Erreur jitsi-recording pour "${event}":`, error);
      }
    }

    const overallSuccess = results.some(r => r.success);
    
    return {
      success: overallSuccess,
      results,
      error: overallSuccess ? undefined : 'Tous les webhooks ont échoué'
    };
  }

  /**
   * 📡 Envoie le payload vers un webhook spécifique
   */
  private async sendToWebhook(
    url: string,
    payload: WebhookPayload,
    type: 'primary' | 'recording'
  ): Promise<{
    webhook: 'primary' | 'recording';
    success: boolean;
    workflowId?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Router/1.0'
        },
        body: JSON.stringify(payload)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`✅ [ROUTER] Webhook ${type} success (${responseTime}ms):`, {
        event: payload.event,
        status: response.status,
        workflowId: result.workflowId || result.executionId
      });

      return {
        webhook: type,
        success: true,
        workflowId: result.workflowId || result.executionId
      };
    } catch (error) {
      console.error(`❌ [ROUTER] Webhook ${type} failed:`, {
        event: payload.event,
        error: error instanceof Error ? error.message : error,
        url
      });

      return {
        webhook: type,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🔍 Obtient les informations de configuration
   */
  getConfig(): {
    primaryEventsConfigured: boolean;
    recordingConfigured: boolean;
    primaryEventsUrl?: string;
    recordingUrl?: string;
  } {
    return {
      primaryEventsConfigured: !!this.config.primaryEventsUrl,
      recordingConfigured: !!this.config.recordingUrl,
      primaryEventsUrl: this.config.primaryEventsUrl,
      recordingUrl: this.config.recordingUrl
    };
  }

  /**
   * 🧪 Test la connectivité vers les deux workflows
   */
  async testConnectivity(): Promise<{
    primary: { success: boolean; status?: number; error?: string };
    recording: { success: boolean; status?: number; error?: string };
  }> {
    const testPayload: WebhookPayload = {
      event: 'connectivity_test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Test de connectivité depuis WebhookRouter',
        environment: import.meta.env.MODE
      },
      source: 'centrinote_router_test'
    };

    const [primaryResult, recordingResult] = await Promise.allSettled([
      this.config.primaryEventsUrl ? this.sendToWebhook(this.config.primaryEventsUrl, testPayload, 'primary') : null,
      this.config.recordingUrl ? this.sendToWebhook(this.config.recordingUrl, testPayload, 'recording') : null
    ]);

    return {
      primary: {
        success: primaryResult.status === 'fulfilled' && primaryResult.value?.success || false,
        error: primaryResult.status === 'rejected' ? primaryResult.reason?.message : undefined
      },
      recording: {
        success: recordingResult.status === 'fulfilled' && recordingResult.value?.success || false,
        error: recordingResult.status === 'rejected' ? recordingResult.reason?.message : undefined
      }
    };
  }
}

// Instance singleton
export const webhookRouter = new WebhookRouter();