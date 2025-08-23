import { supabase } from '../../lib/supabase';
import { ZoomAuthResult, UserZoomIntegration } from '../../types/zoom';

export class ZoomSDKAuth {
  private sdkKey: string;
  private sdkSecret: string;
  private isSDKInitialized: boolean = false;

  constructor() {
    this.sdkKey = import.meta.env.VITE_ZOOM_SDK_KEY || '';
    this.sdkSecret = import.meta.env.VITE_ZOOM_SDK_SECRET || '';
  }

  /**
   * Initialize Zoom Web SDK
   */
  private async initializeSDK(): Promise<boolean> {
    if (this.isSDKInitialized) return true;

    try {
      console.log('🔧 Initialisation du Zoom Web SDK...');
      
      // Check if Zoom SDK is loaded
      if (typeof window === 'undefined' || !(window as any).ZoomMtg) {
        throw new Error('Zoom Web SDK n\'est pas chargé. Ajoutez le script SDK à votre HTML.');
      }

      const ZoomMtg = (window as any).ZoomMtg;
      
      // Initialize SDK
      ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();

      // Set SDK language
      ZoomMtg.i18n.load('fr-FR');
      ZoomMtg.i18n.reload('fr-FR');

      this.isSDKInitialized = true;
      console.log('✅ Zoom Web SDK initialisé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du SDK Zoom:', error);
      return false;
    }
  }

  /**
   * Generate Zoom SDK signature for authentication
   */
  async generateSDKSignature(meetingNumber: string, role: string): Promise<{ signature: string; apiKey: string } | null> {
    try {
      console.log('🔐 Génération signature SDK pour meeting:', meetingNumber);
      
      // Get current user token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session utilisateur requise pour la signature SDK');
      }

      // Call Supabase Edge Function for secure signature generation
      const { data, error } = await supabase.functions.invoke('zoom-sdk-signature', {
        body: {
          meetingNumber,
          role
        }
      });

      if (error) {
        console.error('❌ Erreur fonction signature:', error);
        throw new Error(`Erreur lors de la génération de la signature: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Échec de la génération de signature');
      }

      console.log('✅ Signature SDK générée avec succès');
      return {
        signature: data.signature,
        apiKey: data.apiKey
      };
    } catch (error) {
      console.error('❌ Erreur génération signature:', error);
      return null;
    }
  }

  /**
   * Authenticate user with Zoom SDK
   */
  async authenticate(): Promise<ZoomAuthResult> {
    try {
      console.log('🔐 Début de l\'authentification Zoom SDK...');
      
      // Initialize SDK first
      const sdkReady = await this.initializeSDK();
      if (!sdkReady) {
        return {
          success: false,
          error: 'Impossible d\'initialiser le SDK Zoom'
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

      // For SDK authentication, we'll use a simpler approach
      // Open Zoom authentication in a popup
      const authResult = await this.openZoomAuthPopup();
      
      if (!authResult.success) {
        return authResult;
      }

      // Store integration in database
      const integration = await this.storeUserIntegration(user.id, authResult.user);
      
      return {
        success: true,
        user: authResult.user,
        integration
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification SDK:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur d\'authentification'
      };
    }
  }

  /**
   * Open Zoom authentication in popup
   */
  private async openZoomAuthPopup(): Promise<ZoomAuthResult> {
    return new Promise((resolve) => {
      try {
        console.log('🪟 Ouverture de la popup d\'authentification Zoom...');
        
        // Create a popup window for Zoom authentication
        const popup = window.open(
          '',
          'zoomAuth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          resolve({
            success: false,
            error: 'Impossible d\'ouvrir la popup. Vérifiez que les popups sont autorisées.'
          });
          return;
        }

        // Create authentication form in popup
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Connexion à Zoom</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 20px;
                background: #f8fafc;
                margin: 0;
              }
              .container {
                max-width: 400px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                width: 60px;
                height: 60px;
                background: #2D8CFF;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                font-size: 24px;
                color: white;
                font-weight: bold;
              }
              h2 {
                margin: 0 0 8px;
                color: #1e293b;
                font-size: 24px;
              }
              p {
                margin: 0;
                color: #64748b;
                font-size: 14px;
              }
              .form-group {
                margin-bottom: 20px;
              }
              label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #374151;
                font-size: 14px;
              }
              input {
                width: 100%;
                padding: 12px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.2s;
                box-sizing: border-box;
              }
              input:focus {
                outline: none;
                border-color: #2D8CFF;
                box-shadow: 0 0 0 3px rgba(45, 140, 255, 0.1);
              }
              .btn {
                width: 100%;
                padding: 12px;
                background: #2D8CFF;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
              }
              .btn:hover {
                background: #1e40af;
              }
              .btn:disabled {
                background: #94a3b8;
                cursor: not-allowed;
              }
              .error {
                color: #dc2626;
                font-size: 14px;
                margin-top: 8px;
              }
              .success {
                color: #059669;
                font-size: 14px;
                margin-top: 8px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Z</div>
                <h2>Connexion à Zoom</h2>
                <p>Connectez votre compte Zoom pour créer et gérer vos réunions</p>
              </div>
              
              <form id="zoomAuthForm">
                <div class="form-group">
                  <label for="email">Adresse email Zoom</label>
                  <input type="email" id="email" name="email" required 
                    placeholder="votre.email@exemple.com">
                </div>
                
                <div class="form-group">
                  <label for="displayName">Nom d'affichage</label>
                  <input type="text" id="displayName" name="displayName" required 
                    placeholder="Votre nom">
                </div>
                
                <button type="submit" class="btn" id="connectBtn">
                  Se connecter avec Zoom
                </button>
                
                <div id="message"></div>
              </form>
            </div>
            
            <script>
              document.getElementById('zoomAuthForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const displayName = document.getElementById('displayName').value;
                const messageDiv = document.getElementById('message');
                const btn = document.getElementById('connectBtn');
                
                if (!email || !displayName) {
                  messageDiv.innerHTML = '<div class="error">Tous les champs sont requis</div>';
                  return;
                }
                
                btn.disabled = true;
                btn.textContent = 'Connexion en cours...';
                messageDiv.innerHTML = '<div class="success">Connexion à Zoom...</div>';
                
                // Simulate authentication (in real app, this would call Zoom API)
                setTimeout(() => {
                  const userData = {
                    id: 'zoom_' + Math.random().toString(36).substr(2, 9),
                    email: email,
                    display_name: displayName,
                    account_id: 'acc_' + Math.random().toString(36).substr(2, 9),
                    account_type: 'licensed'
                  };
                  
                  // Send result back to parent window
                  window.opener.postMessage({
                    type: 'zoomAuth',
                    success: true,
                    user: userData
                  }, '*');
                  
                  messageDiv.innerHTML = '<div class="success">✅ Connexion réussie ! Fermeture automatique...</div>';
                  setTimeout(() => window.close(), 1500);
                }, 2000);
              });
              
              // Handle window close
              window.addEventListener('beforeunload', function() {
                if (!window.opener.closed) {
                  window.opener.postMessage({
                    type: 'zoomAuth',
                    success: false,
                    error: 'Authentification annulée'
                  }, '*');
                }
              });
            </script>
          </body>
          </html>
        `);

        // Listen for messages from popup
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'zoomAuth') {
            window.removeEventListener('message', messageHandler);
            
            if (event.data.success) {
              resolve({
                success: true,
                user: event.data.user
              });
            } else {
              resolve({
                success: false,
                error: event.data.error || 'Authentification échouée'
              });
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Handle popup close
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            resolve({
              success: false,
              error: 'Authentification annulée'
            });
          }
        }, 1000);

      } catch (error) {
        console.error('❌ Erreur popup authentification:', error);
        resolve({
          success: false,
          error: 'Erreur lors de l\'ouverture de la popup'
        });
      }
    });
  }

  /**
   * Store user integration in database
   */
  private async storeUserIntegration(userId: string, zoomUser: any): Promise<UserZoomIntegration> {
    try {
      console.log('💾 Stockage de l\'intégration Zoom...');

      // Deactivate existing integrations
      await supabase
        .from('user_zoom_integrations')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Insert new integration
      const integrationData = {
        user_id: userId,
        zoom_user_id: zoomUser.id,
        zoom_email: zoomUser.email,
        zoom_display_name: zoomUser.display_name,
        zoom_account_id: zoomUser.account_id,
        zoom_account_type: zoomUser.account_type,
        authentication_method: 'sdk',
        is_active: true,
        last_authenticated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_zoom_integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Intégration stockée avec succès');
      return data;
    } catch (error) {
      console.error('❌ Erreur lors du stockage de l\'intégration:', error);
      throw error;
    }
  }

  /**
   * Join a Zoom meeting using the SDK
   */
  async joinMeeting(meetingConfig: {
    meetingNumber: string;
    userName: string;
    userEmail: string;
    passWord?: string;
    role?: '0' | '1'; // 0 = participant, 1 = host
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎯 Joining Zoom meeting via SDK:', meetingConfig.meetingNumber);

      // Initialize SDK first
      const sdkReady = await this.initializeSDK();
      if (!sdkReady) {
        return {
          success: false,
          error: 'Impossible d\'initialiser le SDK Zoom'
        };
      }

      // Generate signature
      const signatureData = await this.generateSDKSignature(
        meetingConfig.meetingNumber, 
        meetingConfig.role || '0'
      );

      if (!signatureData) {
        return {
          success: false,
          error: 'Impossible de générer la signature SDK'
        };
      }

      // Get Zoom SDK instance
      const ZoomMtg = (window as any).ZoomMtg;
      if (!ZoomMtg) {
        return {
          success: false,
          error: 'SDK Zoom non disponible'
        };
      }

      // Join meeting
      return new Promise((resolve) => {
        ZoomMtg.join({
          signature: signatureData.signature,
          apiKey: signatureData.apiKey,
          meetingNumber: meetingConfig.meetingNumber,
          userName: meetingConfig.userName,
          userEmail: meetingConfig.userEmail,
          passWord: meetingConfig.passWord || '',
          leaveUrl: window.location.origin + '/zoom/leave',
          role: meetingConfig.role || '0',
          
          success: (result: any) => {
            console.log('✅ Rejoint meeting Zoom avec succès:', result);
            resolve({ success: true });
          },
          
          error: (error: any) => {
            console.error('❌ Erreur rejoindre meeting:', error);
            resolve({
              success: false,
              error: `Erreur SDK: ${error.message || error}`
            });
          }
        });
      });

    } catch (error) {
      console.error('❌ Erreur lors de rejoindre meeting:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Leave current Zoom meeting
   */
  async leaveMeeting(): Promise<boolean> {
    try {
      const ZoomMtg = (window as any).ZoomMtg;
      if (ZoomMtg) {
        ZoomMtg.leaveMeeting({
          success: () => {
            console.log('✅ Meeting quitté avec succès');
          },
          error: (error: any) => {
            console.error('❌ Erreur quitter meeting:', error);
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur quitter meeting:', error);
      return false;
    }
  }

  /**
   * Disconnect user from Zoom
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      console.log('🔌 Déconnexion SDK Zoom pour utilisateur:', userId);

      const { error } = await supabase
        .from('user_zoom_integrations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('authentication_method', 'sdk');

      if (error) throw error;

      console.log('✅ Déconnexion SDK réussie');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion SDK:', error);
      return false;
    }
  }
}