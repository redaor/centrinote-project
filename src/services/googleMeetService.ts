// 🚀 Service Google Meet via Supabase OAuth
// Gestion complète de l'authentification et des réunions Google Meet
// ====================================================================

import { supabase } from '../lib/supabase';
import {
  GoogleMeetSession,
  GoogleMeetAuthResult,
  GoogleTokens,
  GoogleUser,
  GoogleCalendarEvent,
  CreateMeetingRequest,
  GoogleMeetingResponse,
  GoogleMeetError,
  GoogleMeetErrorCode,
  GoogleCalendarListResponse
} from '../types/google-meet';

/**
 * 🔐 Classe principale pour gérer Google Meet via Supabase OAuth
 */
export class GoogleMeetService {
  private readonly redirectUrl: string;
  private readonly scopes: string;

  constructor() {
    this.redirectUrl = `${import.meta.env.VITE_APP_URL}/dashboard`;
    this.scopes = 'openid email profile https://www.googleapis.com/auth/calendar';
  }

  /**
   * 🚀 Initier la connexion Google Meet via Supabase OAuth
   */
  async signInWithGoogle(): Promise<GoogleMeetAuthResult> {
    console.log('🚀 Démarrage authentification Google Meet via Supabase OAuth...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: this.scopes,
          redirectTo: this.redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent' // Force consent pour obtenir refresh_token
          }
        }
      });

      if (error) {
        console.error('❌ Erreur Supabase OAuth Google:', error);
        return {
          success: false,
          error: error.message || 'Erreur lors de l\'authentification Google'
        };
      }

      console.log('✅ Authentification Google initiée via Supabase OAuth');
      console.log('🔄 Redirection vers Google en cours...');
      
      return {
        success: true,
        session: data as any
      };

    } catch (err) {
      console.error('❌ Erreur inattendue authentification Google:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📱 Récupérer la session Google active avec tokens
   */
  async getCurrentGoogleSession(): Promise<GoogleMeetSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erreur récupération session:', error);
        return null;
      }

      if (!session) {
        console.log('ℹ️ Aucune session active');
        return null;
      }

      // Vérifier si c'est une session Google avec les bons scopes
      if (!session.provider_token || session.user?.app_metadata?.provider !== 'google') {
        console.log('ℹ️ Session trouvée mais pas de token Google');
        return null;
      }

      console.log('✅ Session Google active récupérée');
      
      return {
        user: session.user?.user_metadata as GoogleUser,
        session: session,
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token,
        expires_at: session.expires_at
      };

    } catch (err) {
      console.error('❌ Erreur récupération session Google:', err);
      return null;
    }
  }

  /**
   * 🔑 Récupérer uniquement les tokens Google
   */
  async getGoogleTokens(): Promise<GoogleTokens | null> {
    const session = await this.getCurrentGoogleSession();
    
    if (!session?.access_token) {
      return null;
    }

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at
    };
  }

  /**
   * 🔄 Rafraîchir les tokens automatiquement (géré par Supabase)
   */
  async refreshTokens(): Promise<GoogleMeetAuthResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Erreur rafraîchissement tokens:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Tokens Google rafraîchis avec succès');
      
      return {
        success: true,
        session: {
          user: data.user?.user_metadata as GoogleUser,
          session: data.session,
          access_token: data.session?.provider_token,
          refresh_token: data.session?.provider_refresh_token,
          expires_at: data.session?.expires_at
        }
      };

    } catch (err) {
      console.error('❌ Erreur rafraîchissement:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🚪 Déconnecter de Google (garde la session Supabase)
   */
  async signOutFromGoogle(): Promise<boolean> {
    try {
      console.log('ℹ️ Déconnexion Google (via suppression tokens côté client)');
      
      // Pour l'instant, on peut marquer la session comme non-Google côté client
      localStorage.removeItem('google-meet-connected');
      
      return true;
    } catch (err) {
      console.error('❌ Erreur déconnexion Google:', err);
      return false;
    }
  }

  /**
   * ✅ Vérifier si l'utilisateur est connecté à Google
   */
  async isConnectedToGoogle(): Promise<boolean> {
    const session = await this.getCurrentGoogleSession();
    return !!session?.access_token;
  }

  /**
   * 📊 Obtenir les informations de l'utilisateur Google
   */
  async getGoogleUserInfo(): Promise<GoogleUser | null> {
    const session = await this.getCurrentGoogleSession();
    
    if (!session?.access_token) {
      console.log('❌ Pas de token Google disponible');
      return null;
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new GoogleMeetError(
          GoogleMeetErrorCode.AUTHENTICATION_FAILED,
          `Erreur API Google: ${response.status}`
        );
      }

      const userInfo = await response.json();
      console.log('✅ Informations utilisateur Google récupérées');
      
      return userInfo as GoogleUser;

    } catch (err) {
      console.error('❌ Erreur récupération infos utilisateur:', err);
      return null;
    }
  }

  /**
   * 📅 Créer une réunion Google Meet
   */
  async createMeeting(request: CreateMeetingRequest): Promise<GoogleMeetingResponse> {
    const tokens = await this.getGoogleTokens();
    
    if (!tokens) {
      return {
        success: false,
        error: 'Pas de tokens Google disponibles'
      };
    }

    try {
      const eventData = {
        summary: request.title,
        description: request.description || '',
        start: {
          dateTime: request.startTime,
          timeZone: request.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: request.endTime,
          timeZone: request.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: request.attendees?.map(email => ({ email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleMeetError(
          GoogleMeetErrorCode.INVALID_REQUEST,
          `Erreur création réunion: ${response.status}`,
          errorData
        );
      }

      const meeting = await response.json() as GoogleCalendarEvent;
      const meetingUrl = meeting.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri || meeting.htmlLink;

      console.log('✅ Réunion Google Meet créée avec succès');
      
      return {
        success: true,
        meeting,
        meetingUrl
      };

    } catch (err) {
      console.error('❌ Erreur création réunion:', err);
      return {
        success: false,
        error: err instanceof GoogleMeetError ? err.message : 'Erreur de création de réunion'
      };
    }
  }

  /**
   * 📋 Récupérer les réunions Google Calendar
   */
  async getMeetings(maxResults: number = 10): Promise<GoogleCalendarEvent[]> {
    const tokens = await this.getGoogleTokens();
    
    if (!tokens) {
      console.log('❌ Pas de tokens Google disponibles');
      return [];
    }

    try {
      const now = new Date().toISOString();
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.set('timeMin', now);
      url.searchParams.set('maxResults', maxResults.toString());
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new GoogleMeetError(
          GoogleMeetErrorCode.INVALID_REQUEST,
          `Erreur récupération réunions: ${response.status}`
        );
      }

      const data = await response.json() as GoogleCalendarListResponse;
      console.log(`✅ ${data.items.length} réunions récupérées`);
      
      return data.items;

    } catch (err) {
      console.error('❌ Erreur récupération réunions:', err);
      return [];
    }
  }

  /**
   * 🔗 Envoyer les tokens à n8n pour les workflows
   */
  async sendTokensToN8n(): Promise<boolean> {
    const tokens = await this.getGoogleTokens();
    const webhookUrl = import.meta.env.VITE_N8N_GOOGLE_MEET_WEBHOOK;
    
    if (!tokens || !webhookUrl) {
      console.log('❌ Tokens ou webhook URL manquants');
      return false;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'google_meet_oauth_connected',
          data: {
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: tokens.expires_at
            }
          },
          timestamp: new Date().toISOString(),
          source: 'centrinote_google_meet'
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur webhook n8n: ${response.status}`);
      }

      console.log('✅ Tokens envoyés à n8n avec succès');
      return true;

    } catch (err) {
      console.error('❌ Erreur envoi tokens à n8n:', err);
      return false;
    }
  }

  /**
   * 🔗 Supprimer/Annuler une réunion
   */
  async deleteMeeting(eventId: string): Promise<boolean> {
    const tokens = await this.getGoogleTokens();
    
    if (!tokens) {
      return false;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new GoogleMeetError(
          GoogleMeetErrorCode.MEETING_NOT_FOUND,
          `Erreur suppression réunion: ${response.status}`
        );
      }

      console.log('✅ Réunion supprimée avec succès');
      return true;

    } catch (err) {
      console.error('❌ Erreur suppression réunion:', err);
      return false;
    }
  }
}

// 🎯 Instance singleton du service
export const googleMeetService = new GoogleMeetService();