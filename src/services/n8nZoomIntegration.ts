// 🔗 Service d'intégration n8n avec tokens Zoom Supabase
// Adapte les workflows n8n existants pour utiliser les tokens fournis par Supabase OAuth
// ===================================================================================

import { getZoomTokensFromSession } from './supabaseZoomAuth';

interface N8NZoomRequest {
  workflow: string;
  userId?: string;
  data: any;
  requiresZoomAuth?: boolean;
}

interface N8NZoomResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 🚀 Service unifié pour appeler n8n avec tokens Zoom automatiques
 * Les workflows n8n n'ont plus besoin de gérer l'OAuth - ils reçoivent directement les tokens
 */
export class N8NZoomIntegration {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.srv886297.hstgr.cloud';
  }

  /**
   * 📡 Appeler un workflow n8n avec tokens Zoom automatiques
   */
  async callWorkflow(request: N8NZoomRequest): Promise<N8NZoomResponse> {
    console.log(`🚀 Appel workflow n8n: ${request.workflow}`);
    
    try {
      // Préparer le payload de base
      let payload = {
        ...request.data,
        user_id: request.userId,
        timestamp: new Date().toISOString(),
        source: 'supabase-oauth'
      };

      // Ajouter les tokens Zoom si requis
      if (request.requiresZoomAuth) {
        const tokens = await getZoomTokensFromSession();
        
        if (!tokens?.provider_token) {
          throw new Error('Tokens Zoom non disponibles - reconnexion requise');
        }
        
        payload = {
          ...payload,
          zoom_access_token: tokens.provider_token,
          zoom_refresh_token: tokens.provider_refresh_token,
          zoom_expires_at: tokens.expires_at,
          auth_method: 'supabase_oauth'
        };
        
        console.log('✅ Tokens Zoom ajoutés au payload n8n');
      }

      // Construire l'URL du webhook
      const webhookUrl = `${this.baseUrl}/webhook/${request.workflow}`;
      
      console.log(`📡 Appel n8n: ${webhookUrl}`);
      console.log('📦 Payload:', {
        ...payload,
        zoom_access_token: payload.zoom_access_token ? '[TOKEN_PRESENT]' : undefined
      });

      // Appeler le webhook n8n
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'centrinote-supabase',
          'User-Agent': 'Centrinote-OAuth-Integration/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur n8n (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ Réponse n8n reçue:', result);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error(`❌ Erreur workflow n8n ${request.workflow}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📹 Créer une réunion Zoom via n8n (avec tokens Supabase)
   */
  async createZoomMeeting(userId: string, meetingData: {
    topic: string;
    start_time?: string;
    duration?: number;
    agenda?: string;
  }): Promise<N8NZoomResponse> {
    
    return this.callWorkflow({
      workflow: 'zoom-create-meeting',
      userId,
      data: meetingData,
      requiresZoomAuth: true
    });
  }

  /**
   * 📊 Démarrer enregistrement et transcription Zoom via n8n
   */
  async startRecordingTranscription(userId: string, meetingId: string): Promise<N8NZoomResponse> {
    
    return this.callWorkflow({
      workflow: 'zoom-fireflies-enhanced',
      userId,
      data: {
        meeting_id: meetingId,
        action: 'start_recording'
      },
      requiresZoomAuth: true
    });
  }

  /**
   * 📝 Récupérer transcription terminée via n8n
   */
  async getTranscription(userId: string, meetingId: string): Promise<N8NZoomResponse> {
    
    return this.callWorkflow({
      workflow: 'zoom-fireflies-enhanced',
      userId,
      data: {
        meeting_id: meetingId,
        action: 'get_transcription'
      },
      requiresZoomAuth: true
    });
  }

  /**
   * 🔄 Synchroniser tokens Zoom avec n8n (si nécessaire pour certains workflows)
   */
  async syncTokensWithN8N(userId: string): Promise<N8NZoomResponse> {
    console.log('🔄 Synchronisation tokens Zoom avec n8n...');
    
    const tokens = await getZoomTokensFromSession();
    
    if (!tokens?.provider_token) {
      return {
        success: false,
        error: 'Aucun token Zoom disponible'
      };
    }

    return this.callWorkflow({
      workflow: 'zoom-token-sync',
      userId,
      data: {
        access_token: tokens.provider_token,
        refresh_token: tokens.provider_refresh_token,
        expires_at: tokens.expires_at,
        sync_reason: 'supabase_oauth_update'
      },
      requiresZoomAuth: false // Déjà dans le payload
    });
  }

  /**
   * 📋 Récupérer statut des workflows Zoom
   */
  async getZoomWorkflowStatus(userId: string): Promise<N8NZoomResponse> {
    
    return this.callWorkflow({
      workflow: 'zoom-status-check',
      userId,
      data: {
        check_type: 'full_status'
      },
      requiresZoomAuth: true
    });
  }
}

// Instance singleton
export const n8nZoomIntegration = new N8NZoomIntegration();

// Fonctions utilitaires pour les cas d'usage courants
export const createZoomMeeting = async (userId: string, topic: string, startTime?: Date, duration: number = 60) => {
  return n8nZoomIntegration.createZoomMeeting(userId, {
    topic,
    start_time: startTime?.toISOString(),
    duration,
    agenda: `Réunion créée via Centrinote le ${new Date().toLocaleDateString('fr-FR')}`
  });
};

export const startZoomRecording = async (userId: string, meetingId: string) => {
  return n8nZoomIntegration.startRecordingTranscription(userId, meetingId);
};

export const getZoomTranscription = async (userId: string, meetingId: string) => {
  return n8nZoomIntegration.getTranscription(userId, meetingId);
};

// Export par défaut
export default n8nZoomIntegration;