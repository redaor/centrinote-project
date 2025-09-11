// 🔗 Service d'intégration Zoom + n8n
// Gestion automatisée des workflows n8n pour Zoom
// ===============================================

import { zoomOAuthService } from './zoomOAuthService';
import { ZoomMeeting, ZoomEventPayload, N8nZoomWebhookPayload } from '../types/zoom';

export interface N8nWebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 🔗 Classe de gestion de l'intégration Zoom + n8n
 */
export class ZoomN8nIntegration {
  private readonly webhookUrl: string;

  constructor() {
    this.webhookUrl = import.meta.env.VITE_N8N_ZOOM_WEBHOOK || '';
  }

  /**
   * 🚀 Envoyer les tokens OAuth à n8n pour configuration
   */
  async sendOAuthTokens(userId?: string): Promise<N8nWebhookResponse> {
    try {
      const tokens = await zoomOAuthService.getZoomTokens();
      
      if (!tokens) {
        throw new Error('Tokens Zoom non disponibles');
      }

      const payload: N8nZoomWebhookPayload = {
        event: 'zoom_oauth_connected',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at
        },
        user_id: userId,
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_oauth'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur envoi tokens OAuth à n8n:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📅 Envoyer les données de réunion à n8n
   */
  async sendMeetingData(
    meeting: ZoomMeeting, 
    action: 'created' | 'updated' | 'deleted' | 'started' | 'ended',
    userId?: string
  ): Promise<N8nWebhookResponse> {
    try {
      const payload: N8nZoomWebhookPayload = {
        event: `meeting_${action}`,
        tokens: await this.getTokensForN8n(),
        meeting_data: {
          id: meeting.id,
          uuid: meeting.uuid,
          topic: meeting.topic,
          start_time: meeting.start_time,
          duration: meeting.duration,
          join_url: meeting.join_url,
          start_url: meeting.start_url,
          password: meeting.password,
          status: meeting.status,
          settings: meeting.settings
        },
        user_id: userId,
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_meetings'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur envoi données réunion à n8n:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🎥 Envoyer les événements d'enregistrement à n8n
   */
  async sendRecordingEvent(
    meetingId: string,
    recordingData: any,
    action: 'completed' | 'transcript_ready',
    userId?: string
  ): Promise<N8nWebhookResponse> {
    try {
      const payload: N8nZoomWebhookPayload = {
        event: `recording_${action}`,
        tokens: await this.getTokensForN8n(),
        meeting_data: {
          meeting_id: meetingId,
          recording: recordingData
        },
        user_id: userId,
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_recordings'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur envoi événement enregistrement à n8n:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📊 Envoyer les événements webhook Zoom à n8n
   */
  async processZoomWebhookEvent(eventPayload: ZoomEventPayload): Promise<N8nWebhookResponse> {
    try {
      const payload: N8nZoomWebhookPayload = {
        event: eventPayload.event,
        tokens: await this.getTokensForN8n(),
        meeting_data: {
          meeting_id: eventPayload.payload.object.id,
          uuid: eventPayload.payload.object.uuid,
          event_data: eventPayload.payload.object
        },
        timestamp: new Date(eventPayload.event_ts * 1000).toISOString(),
        source: 'centrinote_zoom_webhook'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur traitement webhook Zoom:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🔄 Synchroniser les données utilisateur Zoom avec n8n
   */
  async syncUserData(userId?: string): Promise<N8nWebhookResponse> {
    try {
      const userInfo = await zoomOAuthService.getZoomUserInfo();
      
      if (!userInfo) {
        throw new Error('Informations utilisateur Zoom non disponibles');
      }

      const payload: N8nZoomWebhookPayload = {
        event: 'user_sync',
        tokens: await this.getTokensForN8n(),
        meeting_data: {
          user_info: userInfo
        },
        user_id: userId,
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_user_sync'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur synchronisation utilisateur:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🧪 Tester la connexion avec n8n
   */
  async testConnection(): Promise<N8nWebhookResponse> {
    try {
      const payload = {
        event: 'connection_test',
        tokens: await this.getTokensForN8n(),
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_test'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur test connexion n8n:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📤 Envoyer un webhook générique à n8n
   */
  private async sendWebhook(payload: any): Promise<N8nWebhookResponse> {
    if (!this.webhookUrl) {
      throw new Error('URL webhook n8n non configurée');
    }

    try {
      console.log('📤 Envoi webhook à n8n:', payload.event);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-Zoom-Integration/1.0'
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.text();
      let data;
      try {
        data = JSON.parse(responseData);
      } catch {
        data = responseData;
      }

      if (!response.ok) {
        throw new Error(`Erreur webhook n8n: ${response.status} - ${responseData}`);
      }

      console.log('✅ Webhook envoyé avec succès à n8n');
      
      return {
        success: true,
        data: data
      };
    } catch (err) {
      console.error('❌ Erreur envoi webhook à n8n:', err);
      throw err;
    }
  }

  /**
   * 🔑 Récupérer les tokens pour n8n
   */
  private async getTokensForN8n(): Promise<any> {
    try {
      const tokens = await zoomOAuthService.getZoomTokens();
      
      if (!tokens) {
        return {
          access_token: null,
          refresh_token: null,
          expires_at: null
        };
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at
      };
    } catch (err) {
      console.error('❌ Erreur récupération tokens pour n8n:', err);
      return {
        access_token: null,
        refresh_token: null,
        expires_at: null
      };
    }
  }

  /**
   * ⚙️ Configurer les workflows n8n automatiquement
   */
  async setupN8nWorkflows(): Promise<N8nWebhookResponse> {
    try {
      const payload = {
        event: 'setup_workflows',
        tokens: await this.getTokensForN8n(),
        config: {
          webhook_url: this.webhookUrl,
          features: [
            'meeting_management',
            'recording_processing',
            'transcript_generation',
            'automatic_notes_creation'
          ]
        },
        timestamp: new Date().toISOString(),
        source: 'centrinote_zoom_setup'
      };

      return await this.sendWebhook(payload);
    } catch (err) {
      console.error('❌ Erreur configuration workflows n8n:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur configuration'
      };
    }
  }

  /**
   * ✅ Vérifier si l'intégration n8n est fonctionnelle
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * 📝 Obtenir les informations de configuration
   */
  getConfiguration() {
    return {
      webhook_url: this.webhookUrl,
      configured: this.isConfigured(),
      features: [
        'OAuth Token Management',
        'Meeting Lifecycle Events',
        'Recording Processing',
        'Transcript Generation',
        'Automatic Workflows'
      ]
    };
  }
}

// 🎯 Instance singleton du service
export const zoomN8nIntegration = new ZoomN8nIntegration();