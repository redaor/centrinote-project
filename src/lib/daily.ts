// 🎥 Client Daily.co pour Centrinote
// Gestion des salles de réunion et intégration avec n8n

import { logger } from '../utils/logger';

interface DailyRoomConfig {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    enable_recording?: 'cloud' | 'local' | false;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_knocking?: boolean;
    lang?: string;
    max_participants?: number;
    meeting_join_hook?: string;
    // Note: recording webhooks doivent être configurés au niveau compte, pas dans room properties
    exp?: number; // Expiration timestamp
  };
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: any;
}

interface DailyMeetingSession {
  id: string;
  room: string;
  start_time: string;
  duration: number;
  ongoing: boolean;
  max_participants: number;
}

export class DailyClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.daily.co/v1';
  private domain: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_DAILY_API_KEY || '';
    this.domain = import.meta.env.VITE_DAILY_DOMAIN || 'centrinote.daily.co';

    if (!this.apiKey) {
      // Note: Ce warning est intentionnel et non bloquant - pas besoin de logger
      // La clé API est configurée côté serveur pour des raisons de sécurité
    }
  }

  /**
   * 🏠 Créer une nouvelle salle de réunion
   */
  async createRoom(config: DailyRoomConfig = {}): Promise<DailyRoom> {
    if (!this.apiKey) {
      throw new Error('VITE_DAILY_API_KEY non configurée. Veuillez configurer votre clé API Daily.co dans le fichier .env');
    }

    const roomConfig = {
      name: config.name || this.generateRoomName(),
      privacy: config.privacy || 'private',
      properties: {
        enable_recording: 'cloud',
        enable_chat: true,
        enable_screenshare: true,
        enable_knocking: false,
        lang: 'fr',
        max_participants: 10,
        // ⚠️ IMPORTANT: Les webhooks d'enregistrement NE PEUVENT PAS être configurés dans les propriétés de la room
        // Ils doivent être configurés au niveau ACCOUNT dans Daily Dashboard ou via l'API webhooks
        // Expiration dans 24h par défaut
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        ...config.properties
      }
    };

    logger.debug('Création de salle Daily.co');

    const response = await fetch(`${this.baseUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(roomConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur Daily.co: ${response.status} - ${error}`);
    }

    const room = await response.json();
    logger.debug('Salle Daily.co créée');
    
    return room;
  }

  /**
   * 🗑️ Supprimer une salle de réunion
   */
  async deleteRoom(roomName: string): Promise<void> {
    logger.debug('Suppression de salle Daily.co');

    const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur suppression Daily.co: ${response.status} - ${error}`);
    }

    logger.debug('Salle Daily.co supprimée');
  }

  /**
   * 📊 Obtenir les infos d'une salle
   */
  async getRoomInfo(roomName: string): Promise<DailyRoom> {
    const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur info salle Daily.co: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * 📋 Lister toutes les salles
   */
  async listRooms(): Promise<{ data: DailyRoom[] }> {
    const response = await fetch(`${this.baseUrl}/rooms`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur liste salles Daily.co: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * 🎬 Démarrer l'enregistrement d'une salle
   */
  async startRecording(roomName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rooms/${roomName}/recordings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          enable_recording: 'cloud'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur démarrage enregistrement: ${response.status} - ${error}`);
    }

    logger.debug('Enregistrement Daily.co démarré');
  }

  /**
   * ⏹️ Arrêter l'enregistrement d'une salle
   */
  async stopRecording(roomName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/rooms/${roomName}/recordings`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur arrêt enregistrement: ${response.status} - ${error}`);
    }

    logger.debug('Enregistrement Daily.co arrêté');
  }

  /**
   * 📊 Obtenir les sessions actives d'une salle
   */
  async getMeetingSessions(roomName: string): Promise<DailyMeetingSession[]> {
    const response = await fetch(`${this.baseUrl}/rooms/${roomName}/sessions`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur sessions Daily.co: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * 🎯 Générer un nom de salle unique
   */
  private generateRoomName(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `centrinote-${timestamp}-${random}`;
  }

  /**
   * 🔗 Générer l'URL complète d'une salle
   */
  generateRoomUrl(roomName: string): string {
    return `https://${this.domain}/${roomName}`;
  }

  /**
   * ✅ Tester la connectivité avec l'API Daily.co
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        logger.debug('Connexion API Daily.co réussie');
        return { success: true };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error('Erreur connexion API Daily.co', error instanceof Error ? error : new Error(String(error)));
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📊 Obtenir les statistiques d'utilisation
   */
  async getUsageStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/usage`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur stats Daily.co: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// Instance singleton
export const dailyClient = new DailyClient();