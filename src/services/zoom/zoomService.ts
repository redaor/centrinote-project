import { supabase } from '../../lib/supabase';
import { UserZoomIntegration, ZoomAuthResult, Meeting, MeetingFormData } from '../../types/zoom';
import { ZoomSDKAuth } from './zoomSDKAuth';
import { ZoomOAuthAuth } from './zoomOAuthAuth';
import { ZoomMeetingManager } from './zoomMeetingManager';
import { ZoomWebhookHandler } from './zoomWebhookHandler';

interface ZoomAuthProvider {
  authenticate(): Promise<ZoomAuthResult>;
  disconnect(userId: string): Promise<boolean>;
  refreshToken?(userId: string): Promise<boolean>;
}

class ZoomService {
  private sdkAuth: ZoomSDKAuth;
  private oauthAuth: ZoomOAuthAuth;
  private meetingManager: ZoomMeetingManager;
  private webhookHandler: ZoomWebhookHandler;
  
  constructor() {
    this.sdkAuth = new ZoomSDKAuth();
    this.oauthAuth = new ZoomOAuthAuth();
    this.meetingManager = new ZoomMeetingManager();
    this.webhookHandler = new ZoomWebhookHandler();
  }

  /**
   * Get authentication provider based on method
   */
  private getAuthProvider(method: 'sdk' | 'oauth'): ZoomAuthProvider {
    return method === 'sdk' ? this.sdkAuth : this.oauthAuth;
  }

  /**
   * Authenticate user with Zoom (modular - SDK or OAuth)
   */
  async authenticateUser(method: 'sdk' | 'oauth' = 'sdk'): Promise<ZoomAuthResult> {
    try {
      console.log(`🔐 Authentification Zoom via ${method.toUpperCase()}`);
      
      const authProvider = this.getAuthProvider(method);
      const result = await authProvider.authenticate();
      
      if (result.success && result.user && result.integration) {
        console.log('✅ Authentification réussie:', result.integration.zoom_email);
      } else {
        console.error('❌ Échec authentification:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification Zoom:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur d\'authentification'
      };
    }
  }

  /**
   * Disconnect user from Zoom
   */
  async disconnectUser(userId: string, method: 'sdk' | 'oauth' = 'sdk'): Promise<boolean> {
    try {
      console.log('🔌 Déconnexion Zoom pour utilisateur:', userId);
      
      const authProvider = this.getAuthProvider(method);
      return await authProvider.disconnect(userId);
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      return false;
    }
  }

  /**
   * Get user's Zoom integration
   */
  async getUserIntegration(userId: string): Promise<UserZoomIntegration | null> {
    try {
      const { data, error } = await supabase
        .from('user_zoom_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'intégration:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with Zoom
   */
  async isUserAuthenticated(userId: string): Promise<boolean> {
    const integration = await this.getUserIntegration(userId);
    return integration !== null && integration.is_active;
  }

  /**
   * Create a new meeting
   */
  async createMeeting(userId: string, meetingData: MeetingFormData): Promise<Meeting | null> {
    try {
      console.log('📅 Création d\'un meeting Zoom:', meetingData.title);
      
      const integration = await this.getUserIntegration(userId);
      if (!integration) {
        throw new Error('Aucune intégration Zoom trouvée pour cet utilisateur');
      }

      return await this.meetingManager.createMeeting(integration, meetingData);
    } catch (error) {
      console.error('❌ Erreur lors de la création du meeting:', error);
      return null;
    }
  }

  /**
   * Get user's meetings
   */
  async getUserMeetings(userId: string): Promise<Meeting[]> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des meetings:', error);
      return [];
    }
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;
      
      console.log(`✅ Meeting ${meetingId} mis à jour avec le statut: ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du meeting:', error);
      return false;
    }
  }

  /**
   * Delete/Cancel a meeting
   */
  async deleteMeeting(meetingId: string): Promise<boolean> {
    try {
      console.log('🗑️ Suppression du meeting:', meetingId);
      
      // First, try to cancel the meeting in Zoom
      const meeting = await this.getMeetingById(meetingId);
      if (meeting) {
        await this.meetingManager.cancelMeeting(meeting.zoom_meeting_id);
      }

      // Then delete from our database
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      
      console.log('✅ Meeting supprimé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du meeting:', error);
      return false;
    }
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<Meeting | null> {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du meeting:', error);
      return null;
    }
  }

  /**
   * Process webhook from Zoom
   */
  async processWebhook(payload: any): Promise<boolean> {
    try {
      console.log('🔄 Traitement du webhook Zoom:', payload.event);
      
      return await this.webhookHandler.processWebhook(payload);
    } catch (error) {
      console.error('❌ Erreur lors du traitement du webhook:', error);
      return false;
    }
  }

  /**
   * Trigger N8N workflow for meeting processing
   */
  async triggerN8NWorkflow(meetingId: string, event: string, data: any): Promise<boolean> {
    try {
      console.log(`🔄 Déclenchement workflow N8N pour meeting ${meetingId}, événement: ${event}`);
      
      return await this.webhookHandler.triggerN8NWorkflow(meetingId, event, data);
    } catch (error) {
      console.error('❌ Erreur lors du déclenchement du workflow N8N:', error);
      return false;
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(userId: string): Promise<any> {
    try {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total_meetings: meetings?.length || 0,
        scheduled_meetings: meetings?.filter(m => m.status === 'scheduled').length || 0,
        completed_meetings: meetings?.filter(m => m.status === 'ended').length || 0,
        recordings_processed: meetings?.filter(m => m.recording_processed).length || 0,
        summaries_generated: meetings?.filter(m => m.summary_generated).length || 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      return {
        total_meetings: 0,
        scheduled_meetings: 0,
        completed_meetings: 0,
        recordings_processed: 0,
        summaries_generated: 0
      };
    }
  }

  /**
   * Test Zoom connection
   */
  async testConnection(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const integration = await this.getUserIntegration(userId);
      
      if (!integration) {
        return {
          success: false,
          message: 'Aucune intégration Zoom configurée'
        };
      }

      if (!integration.is_active) {
        return {
          success: false,
          message: 'Intégration Zoom inactive'
        };
      }

      // Test with Zoom API if needed
      return {
        success: true,
        message: 'Connexion Zoom opérationnelle'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion'
      };
    }
  }
}

// Export singleton instance
export const zoomService = new ZoomService();