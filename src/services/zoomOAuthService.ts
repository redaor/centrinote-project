// 🚀 Service d'authentification Zoom via Supabase OAuth
// Gestion complète de l'authentification Zoom avec Supabase OAuth Provider
// =================================================================

import { supabase } from '../lib/supabase';

export interface ZoomAuthSession {
  user: any;
  session: any;
  provider_token?: string;
  provider_refresh_token?: string;
  expires_at?: number;
}

export interface ZoomAuthResult {
  success: boolean;
  error?: string;
  session?: ZoomAuthSession;
}

export interface ZoomTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

/**
 * 🔐 Classe principale pour gérer l'authentification Zoom via Supabase OAuth
 */
export class ZoomOAuthService {
  private readonly redirectUrl: string;

  constructor() {
    this.redirectUrl = `${import.meta.env.VITE_APP_URL}/dashboard`;
  }

  /**
   * 🚀 Initier la connexion Zoom via Supabase OAuth
   * Utilise le provider OAuth natif de Supabase pour Zoom
   */
  async signInWithZoom(): Promise<ZoomAuthResult> {
    console.log('🚀 Démarrage authentification Zoom via Supabase OAuth...');
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'zoom',
        options: {
          scopes: 'meeting:write meeting:read user:read recording:read',
          redirectTo: this.redirectUrl,
          queryParams: {
            access_type: 'offline' // Pour obtenir un refresh token
          }
        }
      });

      if (error) {
        console.error('❌ Erreur Supabase OAuth Zoom:', error);
        return {
          success: false,
          error: error.message || 'Erreur lors de l\'authentification Zoom'
        };
      }

      console.log('✅ Authentification Zoom initiée via Supabase OAuth');
      console.log('🔄 Redirection vers Zoom en cours...');
      
      return {
        success: true,
        session: data as any
      };

    } catch (err) {
      console.error('❌ Erreur inattendue authentification Zoom:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📱 Récupérer la session Zoom active avec tokens
   * Les tokens sont automatiquement gérés par Supabase
   */
  async getCurrentZoomSession(): Promise<ZoomAuthSession | null> {
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

      // Vérifier si c'est une session Zoom
      if (!session.provider_token) {
        console.log('ℹ️ Session trouvée mais pas de token Zoom');
        return null;
      }

      console.log('✅ Session Zoom active récupérée');
      
      return {
        user: session.user,
        session: session,
        provider_token: session.provider_token,
        provider_refresh_token: session.provider_refresh_token,
        expires_at: session.expires_at
      };

    } catch (err) {
      console.error('❌ Erreur récupération session Zoom:', err);
      return null;
    }
  }

  /**
   * 🔑 Récupérer uniquement les tokens Zoom de la session
   */
  async getZoomTokens(): Promise<ZoomTokens | null> {
    const session = await this.getCurrentZoomSession();
    
    if (!session?.provider_token) {
      return null;
    }

    return {
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token,
      expires_at: session.expires_at
    };
  }

  /**
   * 🔄 Rafraîchir les tokens automatiquement (géré par Supabase)
   */
  async refreshTokens(): Promise<ZoomAuthResult> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Erreur rafraîchissement tokens:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('✅ Tokens rafraîchis avec succès');
      
      return {
        success: true,
        session: {
          user: data.user,
          session: data.session,
          provider_token: data.session?.provider_token,
          provider_refresh_token: data.session?.provider_refresh_token,
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
   * 🚪 Déconnecter de Zoom (garde la session Supabase)
   */
  async signOutFromZoom(): Promise<boolean> {
    try {
      // Note: Avec Supabase OAuth, nous ne pouvons pas déconnecter seulement Zoom
      // Il faudrait gérer cela côté Supabase ou implémenter une logique custom
      console.log('ℹ️ Déconnexion Zoom (via suppression tokens côté client)');
      
      // Pour l'instant, on peut marquer la session comme non-Zoom côté client
      localStorage.removeItem('zoom-connected');
      
      return true;
    } catch (err) {
      console.error('❌ Erreur déconnexion Zoom:', err);
      return false;
    }
  }

  /**
   * ✅ Vérifier si l'utilisateur est connecté à Zoom
   */
  async isConnectedToZoom(): Promise<boolean> {
    const session = await this.getCurrentZoomSession();
    return !!session?.provider_token;
  }

  /**
   * 📊 Obtenir les informations de l'utilisateur Zoom
   */
  async getZoomUserInfo(): Promise<any | null> {
    const tokens = await this.getZoomTokens();
    
    if (!tokens) {
      console.log('❌ Pas de tokens Zoom disponibles');
      return null;
    }

    try {
      const response = await fetch('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API Zoom: ${response.status}`);
      }

      const userInfo = await response.json();
      console.log('✅ Informations utilisateur Zoom récupérées');
      
      return userInfo;

    } catch (err) {
      console.error('❌ Erreur récupération infos utilisateur:', err);
      return null;
    }
  }

  /**
   * 🔗 Envoyer les tokens à n8n pour les workflows
   */
  async sendTokensToN8n(): Promise<boolean> {
    const tokens = await this.getZoomTokens();
    const webhookUrl = import.meta.env.VITE_N8N_ZOOM_WEBHOOK;
    
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
          event: 'zoom_oauth_connected',
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at
          },
          timestamp: new Date().toISOString(),
          source: 'centrinote_zoom_oauth'
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
}

// 🎯 Instance singleton du service
export const zoomOAuthService = new ZoomOAuthService();