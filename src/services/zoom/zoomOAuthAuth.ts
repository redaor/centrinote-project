import { supabase } from '../../lib/supabase';
import { ZoomAuthResult, UserZoomIntegration } from '../../types/zoom';

export class ZoomOAuthAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = import.meta.env.VITE_ZOOM_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_ZOOM_CLIENT_SECRET || '';
    this.redirectUri = 'https://centrinote.fr/zoom-callback';
  }

  /**
   * Authenticate user with Zoom OAuth (for future use)
   */
  async authenticate(): Promise<ZoomAuthResult> {
    try {
      console.log('🔐 Début de l\'authentification Zoom OAuth...');
      
      // Check if OAuth is configured
      if (!this.clientId || !this.clientSecret) {
        return {
          success: false,
          error: 'OAuth Zoom non configuré. Utilisez l\'authentification SDK en attendant.'
        };
      }

      // Get current user from Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Generate OAuth URL
      const authUrl = this.generateOAuthURL();
      
      // Open OAuth in popup
      const authResult = await this.openOAuthPopup(authUrl);
      
      if (!authResult.success) {
        return authResult;
      }

      // Exchange code for tokens
      const tokenResult = await this.exchangeCodeForTokens(authResult.code);
      
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Get user info from Zoom
      const userInfo = await this.getZoomUserInfo(tokenResult.accessToken);
      
      // Store integration in database
      const integration = await this.storeUserIntegration(user.id, userInfo, tokenResult);
      
      return {
        success: true,
        user: userInfo,
        integration
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification OAuth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur d\'authentification OAuth'
      };
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  private generateOAuthURL(): string {
    // Générer un state sécurisé avec crypto.randomUUID()
    const state = crypto.randomUUID();
    sessionStorage.setItem('zoom_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: 'meeting:write meeting:read user:read recording:read'
    });

    return `https://zoom.us/oauth/authorize?${params.toString()}`;
  }

  /**
   * Open OAuth popup and handle callback
   */
  private async openOAuthPopup(authUrl: string): Promise<{ success: boolean; code?: string; error?: string }> {
    return new Promise((resolve) => {
      const popup = window.open(authUrl, 'zoomOAuth', 'width=600,height=700');
      
      if (!popup) {
        resolve({
          success: false,
          error: 'Impossible d\'ouvrir la popup OAuth'
        });
        return;
      }

      // Poll for popup close or message
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve({
            success: false,
            error: 'Authentification annulée'
          });
        }
      }, 1000);

      // Listen for callback
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'zoomOAuthCallback') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageHandler);
          
          if (event.data.success) {
            resolve({
              success: true,
              code: event.data.code
            });
          } else {
            resolve({
              success: false,
              error: event.data.error
            });
          }
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForTokens(code: string): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> {
    try {
      const response = await fetch('/api/zoom/oauth-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'échange du code');
      }

      const data = await response.json();
      
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      console.error('❌ Erreur échange token:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'échange du token'
      };
    }
  }

  /**
   * Get Zoom user information
   */
  private async getZoomUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch('/api/zoom/user-info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des infos utilisateur');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Erreur récupération user info:', error);
      throw error;
    }
  }

  /**
   * Store OAuth integration in database
   */
  private async storeUserIntegration(userId: string, zoomUser: any, tokens: any): Promise<UserZoomIntegration> {
    try {
      // Encrypt tokens (simplified - should use proper encryption)
      const encryptedAccessToken = btoa(tokens.accessToken);
      const encryptedRefreshToken = btoa(tokens.refreshToken);

      // Deactivate existing integrations
      await supabase
        .from('user_zoom_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);

      const integrationData = {
        user_id: userId,
        zoom_user_id: zoomUser.id,
        zoom_email: zoomUser.email,
        zoom_display_name: zoomUser.display_name,
        zoom_account_id: zoomUser.account_id,
        zoom_account_type: zoomUser.type,
        authentication_method: 'oauth',
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        is_active: true,
        last_authenticated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_zoom_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Erreur stockage OAuth:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Actualisation du token OAuth pour utilisateur:', userId);

      const { data: integration, error } = await supabase
        .from('user_zoom_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('authentication_method', 'oauth')
        .eq('is_active', true)
        .single();

      if (error || !integration) {
        throw new Error('Intégration OAuth non trouvée');
      }

      // Decrypt refresh token
      const refreshToken = atob(integration.refresh_token_encrypted || '');

      const response = await fetch('/api/zoom/oauth-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'actualisation du token');
      }

      const tokens = await response.json();

      // Update database with new tokens
      await supabase
        .from('user_zoom_integrations')
        .update({
          access_token_encrypted: btoa(tokens.access_token),
          refresh_token_encrypted: btoa(tokens.refresh_token),
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      console.log('✅ Token OAuth actualisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur actualisation token:', error);
      return false;
    }
  }

  /**
   * Disconnect OAuth integration
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      console.log('🔌 Déconnexion OAuth Zoom pour utilisateur:', userId);

      // Revoke tokens with Zoom API
      const { data: integration } = await supabase
        .from('user_zoom_integrations')
        .select('access_token_encrypted')
        .eq('user_id', userId)
        .eq('authentication_method', 'oauth')
        .eq('is_active', true)
        .single();

      if (integration?.access_token_encrypted) {
        try {
          await fetch('/api/zoom/oauth-revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: atob(integration.access_token_encrypted),
              client_id: this.clientId,
              client_secret: this.clientSecret
            })
          });
        } catch (revokeError) {
          console.warn('⚠️ Erreur lors de la révocation du token:', revokeError);
        }
      }

      // Deactivate integration
      const { error } = await supabase
        .from('user_zoom_integrations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('authentication_method', 'oauth');

      if (error) throw error;

      console.log('✅ Déconnexion OAuth réussie');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion OAuth:', error);
      return false;
    }
  }
}