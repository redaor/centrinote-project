// 🔗 Service d'intégration Google Meet avec n8n
// Gestion des webhooks et automatisation des workflows Google Meet
// =================================================================

import { googleMeetService } from './googleMeetService';
import {
  GoogleMeetN8nEvent,
  GoogleCalendarEvent,
  GoogleUser,
  GoogleTokens
} from '../types/google-meet';

export interface GoogleN8nConfig {
  webhook_url: string;
  enabled: boolean;
}

export interface GoogleN8nTestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

/**
 * 🔗 Classe pour gérer l'intégration Google Meet avec n8n
 */
export class GoogleN8nIntegration {
  private config: GoogleN8nConfig;

  constructor() {
    this.config = {
      webhook_url: import.meta.env.VITE_N8N_GOOGLE_MEET_WEBHOOK || '',
      enabled: !!import.meta.env.VITE_N8N_GOOGLE_MEET_WEBHOOK
    };
  }

  /**
   * 🔧 Vérifier si n8n est configuré
   */
  isConfigured(): boolean {
    return this.config.enabled && !!this.config.webhook_url;
  }

  /**
   * ⚙️ Obtenir la configuration actuelle
   */
  getConfiguration(): GoogleN8nConfig {
    return { ...this.config };
  }

  /**
   * 🧪 Tester la connexion n8n
   */
  async testConnection(): Promise<GoogleN8nTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Webhook URL n8n non configuré'
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'google_meet_test_connection',
          data: {
            test: true,
            timestamp: new Date().toISOString()
          },
          source: 'centrinote_google_meet'
        })
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.ok,
        statusCode: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };

    } catch (err) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Erreur réseau'
      };
    }
  }

  /**
   * 🔑 Envoyer les tokens OAuth à n8n
   */
  async sendOAuthTokens(tokens?: GoogleTokens): Promise<boolean> {
    if (!this.isConfigured()) {
      console.log('❌ n8n non configuré pour Google Meet');
      return false;
    }

    try {
      const tokensToSend = tokens || await googleMeetService.getGoogleTokens();
      
      if (!tokensToSend) {
        console.log('❌ Aucun token Google disponible');
        return false;
      }

      const event: GoogleMeetN8nEvent = {
        event: 'google_meet_oauth_connected',
        data: {
          tokens: tokensToSend
        },
        timestamp: new Date().toISOString(),
        source: 'centrinote_google_meet'
      };

      const response = await this.sendEvent(event);
      
      if (response) {
        console.log('✅ Tokens Google envoyés à n8n');
      }

      return response;

    } catch (err) {
      console.error('❌ Erreur envoi tokens OAuth à n8n:', err);
      return false;
    }
  }

  /**
   * 📅 Envoyer les données de réunion à n8n
   */
  async sendMeetingData(
    meeting: GoogleCalendarEvent, 
    action: 'created' | 'updated' | 'deleted'
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const eventType = action === 'created' ? 'meeting_created' :
                       action === 'updated' ? 'meeting_updated' : 'meeting_deleted';

      const event: GoogleMeetN8nEvent = {
        event: eventType,
        data: {
          meeting
        },
        timestamp: new Date().toISOString(),
        source: 'centrinote_google_meet'
      };

      const success = await this.sendEvent(event);
      
      if (success) {
        console.log(`✅ Données réunion ${action} envoyées à n8n`);
      }

      return success;

    } catch (err) {
      console.error('❌ Erreur envoi données réunion à n8n:', err);
      return false;
    }
  }

  /**
   * 👤 Envoyer les informations utilisateur à n8n
   */
  async sendUserData(user: GoogleUser): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const event: GoogleMeetN8nEvent = {
        event: 'google_meet_oauth_connected',
        data: {
          user
        },
        timestamp: new Date().toISOString(),
        source: 'centrinote_google_meet'
      };

      const success = await this.sendEvent(event);
      
      if (success) {
        console.log('✅ Données utilisateur Google envoyées à n8n');
      }

      return success;

    } catch (err) {
      console.error('❌ Erreur envoi données utilisateur à n8n:', err);
      return false;
    }
  }

  /**
   * 🔄 Traiter un événement webhook Google (si reçu depuis n8n)
   */
  async processGoogleWebhookEvent(eventData: any): Promise<boolean> {
    try {
      console.log('🔄 Traitement événement webhook Google:', eventData);

      // Traitement basé sur le type d'événement
      switch (eventData.event) {
        case 'meeting_created':
          // Traiter la création de réunion
          console.log('📅 Nouvelle réunion créée:', eventData.data.meeting);
          break;

        case 'meeting_updated':
          // Traiter la modification de réunion
          console.log('📝 Réunion modifiée:', eventData.data.meeting);
          break;

        case 'meeting_deleted':
          // Traiter la suppression de réunion
          console.log('🗑️ Réunion supprimée:', eventData.data.meeting);
          break;

        default:
          console.log('❓ Événement Google non géré:', eventData.event);
      }

      return true;

    } catch (err) {
      console.error('❌ Erreur traitement événement webhook:', err);
      return false;
    }
  }

  /**
   * 📤 Envoyer un événement générique à n8n
   */
  private async sendEvent(event: GoogleMeetN8nEvent): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Centrinote-GoogleMeet/1.0'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        console.error(`❌ Erreur webhook n8n: HTTP ${response.status}`);
        return false;
      }

      return true;

    } catch (err) {
      console.error('❌ Erreur envoi événement n8n:', err);
      return false;
    }
  }

  /**
   * 🔄 Synchroniser toutes les données avec n8n
   */
  async syncAllData(): Promise<{
    tokens: boolean;
    user: boolean;
    meetings: boolean;
  }> {
    const results = {
      tokens: false,
      user: false,
      meetings: false
    };

    if (!this.isConfigured()) {
      return results;
    }

    try {
      // 1. Synchroniser les tokens
      results.tokens = await this.sendOAuthTokens();

      // 2. Synchroniser les données utilisateur
      const user = await googleMeetService.getGoogleUserInfo();
      if (user) {
        results.user = await this.sendUserData(user);
      }

      // 3. Synchroniser les réunions récentes
      const meetings = await googleMeetService.getMeetings(10);
      if (meetings.length > 0) {
        const meetingPromises = meetings.map(meeting => 
          this.sendMeetingData(meeting, 'created')
        );
        const meetingResults = await Promise.all(meetingPromises);
        results.meetings = meetingResults.every(result => result);
      } else {
        results.meetings = true; // Pas de réunions = succès
      }

      console.log('🔄 Synchronisation complète n8n:', results);

    } catch (err) {
      console.error('❌ Erreur synchronisation globale n8n:', err);
    }

    return results;
  }

  /**
   * ⚙️ Mettre à jour la configuration n8n
   */
  updateConfiguration(config: Partial<GoogleN8nConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }
}

// 🎯 Instance singleton du service
export const googleN8nIntegration = new GoogleN8nIntegration();