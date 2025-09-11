// ❌ ANCIEN SERVICE ZOOM - DÉSACTIVÉ  
// Remplacé par supabaseZoomAuth.ts et useSupabaseZoom.ts
// ======================================================

/* SERVICE DÉSACTIVÉ - UTILISER supabaseZoomAuth.ts À LA PLACE

import { ZoomMeeting, ZoomParticipant, ZoomInvitation, ZoomWebhookPayload, ZoomMeetingStats } from '../types/zoom';
import { webhookService } from './webhookService';
import { supabase } from '../lib/supabase';

class ZoomServiceDisabled {
  private baseUrl: string;
  private oauthConfig = {
    client_id: import.meta.env.VITE_ZOOM_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_ZOOM_REDIRECT_URI,
    scope: 'meeting:write meeting:read user:read'
  };

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Vérifier la configuration OAuth
    this.validateOAuthConfig();
  }

  /**
   * Valide la configuration OAuth Zoom
   */
  private validateOAuthConfig(): void {
    const errors: string[] = [];
    
    if (!this.oauthConfig.client_id) {
      errors.push('VITE_ZOOM_CLIENT_ID manquant dans .env');
    }
    
    if (!this.oauthConfig.redirect_uri) {
      errors.push('VITE_ZOOM_REDIRECT_URI manquant dans .env');
    }
    
    if (!this.baseUrl) {
      errors.push('VITE_SUPABASE_URL manquant dans .env');
    }
    
    if (errors.length > 0) {
      console.error('❌ Configuration Zoom OAuth incomplète:', errors);
      console.log('📋 Variables requises dans .env:');
      console.log('VITE_ZOOM_CLIENT_ID=your_zoom_client_id');
      console.log('VITE_ZOOM_REDIRECT_URI=https://your-supabase-url/functions/v1/zoom-oauth-callback');
      console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
    }
  }

  /**
   * Génère l'URL d'autorisation OAuth Zoom
   */
  generateOAuthUrl(userId: string): string {
    if (!this.oauthConfig.client_id) {
      throw new Error('VITE_ZOOM_CLIENT_ID non configuré. Vérifiez votre fichier .env');
    }
    
    if (!this.oauthConfig.redirect_uri) {
      throw new Error('VITE_ZOOM_REDIRECT_URI non configuré. Vérifiez votre fichier .env');
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauthConfig.client_id,
      redirect_uri: this.oauthConfig.redirect_uri,
      scope: this.oauthConfig.scope,
      state: userId // Passer l'user_id dans le state pour le récupérer au callback
    });

    const oauthUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;
    console.log('🔗 URL OAuth générée:', oauthUrl);
    console.log('📋 Configuration utilisée:', {
      client_id: this.oauthConfig.client_id,
      redirect_uri: this.oauthConfig.redirect_uri,
      scope: this.oauthConfig.scope
    });
    
    return oauthUrl;
  }

  /**
   * Obtient le statut de la configuration OAuth
   */
  getOAuthConfigStatus(): { configured: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.oauthConfig.client_id) {
      errors.push('VITE_ZOOM_CLIENT_ID manquant');
    }
    
    if (!this.oauthConfig.redirect_uri) {
      errors.push('VITE_ZOOM_REDIRECT_URI manquant');
    }
    
    if (!this.baseUrl) {
      errors.push('VITE_SUPABASE_URL manquant');
    }
    
    return {
      configured: errors.length === 0,
      errors
    };
  }

  /**
   * Vérifie si l'utilisateur a un token Zoom valide
   */
  async hasValidToken(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('zoom_tokens')
        .select('expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      // Vérifier si le token n'a pas expiré (avec une marge de 5 minutes)
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      return expiresAt > fiveMinutesFromNow;
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      return false;
    }
  }

  /**
   * Récupère le token d'accès valide pour un utilisateur
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      // Appeler l'Edge Function pour obtenir/rafraîchir le token
      const response = await fetch(`${this.baseUrl}/functions/v1/zoom-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        console.warn('Impossible de récupérer le token utilisateur');
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  /**
   * Déconnecte l'utilisateur de Zoom (supprime les tokens)
   */
  async disconnectZoom(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('zoom_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Erreur lors de la déconnexion Zoom:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion Zoom:', error);
      return false;
    }
  }

  /**
   * Crée une nouvelle réunion Zoom via n8n
   */
  async createMeeting(
    meetingData: Omit<ZoomMeeting, 'id' | 'created_at' | 'updated_at' | 'status'>,
    participantEmails: string[] = [],
    userId: string
  ): Promise<{ success: boolean; meetingId?: string; error?: string }> {
    try {
      console.log('🔄 Création d\'une réunion Zoom via n8n...');

      // Récupérer le token d'accès utilisateur
      const userAccessToken = await this.getValidAccessToken(userId);

      const payload: ZoomWebhookPayload = {
        action: 'create_zoom_meeting',
        meeting: {
          topic: meetingData.topic,
          description: meetingData.description,
          start_time: meetingData.start_time,
          duration: meetingData.duration,
          timezone: meetingData.timezone,
          password: meetingData.password,
          waiting_room: meetingData.waiting_room,
          join_before_host: meetingData.join_before_host,
          mute_upon_entry: meetingData.mute_upon_entry,
          auto_recording: meetingData.auto_recording,
          meeting_type: meetingData.meeting_type
        },
        participants: participantEmails,
        userId,
        timestamp: new Date().toISOString(),
        userAccessToken: userAccessToken // Ajouter le token utilisateur au payload
      };

      const result = await webhookService.sendWebhookRequest('create_zoom_meeting', payload);

      if (result.success) {
        console.log('✅ Réunion Zoom créée avec succès');
        return {
          success: true,
          meetingId: result.data?.meeting_id || Date.now().toString()
        };
      } else {
        console.error('❌ Erreur lors de la création de la réunion:', result.message);
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la réunion Zoom:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Met à jour une réunion Zoom existante
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<ZoomMeeting>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Mise à jour de la réunion Zoom:', meetingId);

      // Récupérer le token d'accès utilisateur
      const userAccessToken = await this.getValidAccessToken(userId);

      const payload: ZoomWebhookPayload = {
        action: 'update_zoom_meeting',
        meeting: {
          id: meetingId,
          ...updates
        },
        userId,
        timestamp: new Date().toISOString(),
        userAccessToken: userAccessToken
      };

      const result = await webhookService.sendWebhookRequest('update_zoom_meeting', payload);

      if (result.success) {
        console.log('✅ Réunion Zoom mise à jour avec succès');
        return { success: true };
      } else {
        console.error('❌ Erreur lors de la mise à jour:', result.message);
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la réunion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Annule une réunion Zoom
   */
  async cancelMeeting(
    meetingId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Annulation de la réunion Zoom:', meetingId);

      // Récupérer le token d'accès utilisateur
      const userAccessToken = await this.getValidAccessToken(userId);

      const payload: ZoomWebhookPayload = {
        action: 'cancel_zoom_meeting',
        meeting: {
          id: meetingId,
          status: 'cancelled'
        },
        userId,
        timestamp: new Date().toISOString(),
        userAccessToken: userAccessToken
      };

      const result = await webhookService.sendWebhookRequest('cancel_zoom_meeting', payload);

      if (result.success) {
        console.log('✅ Réunion Zoom annulée avec succès');
        return { success: true };
      } else {
        console.error('❌ Erreur lors de l\'annulation:', result.message);
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'annulation de la réunion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Envoie des invitations pour une réunion
   */
  async sendInvitations(
    meetingId: string,
    invitations: Omit<ZoomInvitation, 'id' | 'meeting_id' | 'sent_at' | 'status'>[],
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Envoi d\'invitations Zoom pour la réunion:', meetingId);

      // Récupérer le token d'accès utilisateur
      const userAccessToken = await this.getValidAccessToken(userId);

      const payload: ZoomWebhookPayload = {
        action: 'send_zoom_invitations',
        meeting: { id: meetingId },
        invitations: invitations.map(inv => ({
          ...inv,
          meeting_id: meetingId
        })),
        userId,
        timestamp: new Date().toISOString(),
        userAccessToken: userAccessToken
      };

      const result = await webhookService.sendWebhookRequest('send_zoom_invitations', payload);

      if (result.success) {
        console.log('✅ Invitations Zoom envoyées avec succès');
        return { success: true };
      } else {
        console.error('❌ Erreur lors de l\'envoi des invitations:', result.message);
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des invitations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Génère des statistiques de réunions (données simulées)
   */
  generateMeetingStats(meetings: ZoomMeeting[]): ZoomMeetingStats {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

    return {
      total_meetings: meetings.length,
      upcoming_meetings: meetings.filter(m => m.start_time > now && m.status === 'scheduled').length,
      completed_meetings: meetings.filter(m => m.status === 'ended').length,
      cancelled_meetings: meetings.filter(m => m.status === 'cancelled').length,
      total_participants: meetings.reduce((acc, m) => acc + (m.participants?.length || 0), 0),
      average_duration: meetings.length > 0 
        ? Math.round(meetings.reduce((acc, m) => acc + m.duration, 0) / meetings.length)
        : 0,
      this_week_meetings: meetings.filter(m => 
        m.start_time >= weekStart && m.start_time <= now
      ).length
    };
  }

  /**
   * Valide les données d'une réunion
   */
  validateMeetingData(meeting: Partial<ZoomMeeting>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!meeting.topic || meeting.topic.trim().length === 0) {
      errors.push('Le sujet de la réunion est obligatoire');
    }

    if (!meeting.start_time || meeting.start_time <= new Date()) {
      errors.push('La date de début doit être dans le futur');
    }

    if (!meeting.duration || meeting.duration < 15 || meeting.duration > 480) {
      errors.push('La durée doit être entre 15 et 480 minutes');
    }

    if (meeting.password && meeting.password.length < 4) {
      errors.push('Le mot de passe doit contenir au moins 4 caractères');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Formate une date pour l'affichage
   */
  formatMeetingDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Génère un mot de passe sécurisé pour la réunion
   */
  generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Obtient les fuseaux horaires disponibles
   */
  getAvailableTimezones(): { value: string; label: string }[] {
    return [
      { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
      { value: 'Europe/London', label: 'Londres (UTC+0)' },
      { value: 'America/New_York', label: 'New York (UTC-5)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
      { value: 'Australia/Sydney', label: 'Sydney (UTC+11)' }
    ];
  }
}

*/

// ⚠️ ANCIEN SERVICE DÉSACTIVÉ - UTILISEZ supabaseZoomAuth.ts ET useSupabaseZoom.ts
import { ZoomMeeting } from '../types/zoom';

class ZoomServiceDisabled {
  generateOAuthUrl(): never {
    throw new Error('❌ Ancien service désactivé - utilisez supabaseZoomAuth.signInWithZoomOAuth() à la place');
  }
  
  createMeeting(): never {
    throw new Error('❌ Ancien service désactivé - utilisez useSupabaseZoom.createMeeting() à la place'); 
  }
  
  hasValidToken(): never {
    throw new Error('❌ Ancien service désactivé - utilisez supabaseZoomAuth.isZoomConnected() à la place');
  }
}

// Instance désactivée
export const zoomService = new ZoomServiceDisabled();