// ❌ ANCIEN SYSTÈME OAUTH - DÉSACTIVÉ
// Ce composant utilise l'ancien système OAuth manuel - remplacé par SupabaseZoomAuth.tsx
// ==================================================================================

/* COMPOSANT DÉSACTIVÉ - UTILISER SupabaseZoomAuth.tsx À LA PLACE
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../AuthProvider';
import { supabase } from '../../lib/supabase';
import { generateZoomOAuthUrl, CENTRINOTE_ZOOM_CONFIG } from '../../utils/zoomOAuth';

interface ZoomAuthProps {
  onTokenReceived?: (token: any) => void;
}

interface ZoomAuthRef {
  refreshConnectionState: () => Promise<void>;
}

const SimpleZoomAuth = forwardRef<ZoomAuthRef, ZoomAuthProps>(({ onTokenReceived }, ref) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Configuration OAuth Zoom unifiée
  const ZOOM_CLIENT_ID = import.meta.env.VITE_ZOOM_CLIENT_ID || '';
  const REDIRECT_URI = `${import.meta.env.VITE_APP_URL}/zoom/callback`; // ✅ URL unifiée

  useEffect(() => {
    if (user) {
      checkExistingToken();
    }
  }, [user]);

  // Vérifier si l'utilisateur a déjà un token Zoom valide
  const checkExistingToken = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // ✅ Utilise supabase-js avec session auth (pas de fetch REST)
      const { data, error } = await supabase
        .from('zoom_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔍 Vérification token existant:', { hasData: !!data, error });

      if (data && !error) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          console.log('✅ Token Zoom valide trouvé');
          setIsConnected(true);
          setTokenInfo({ expires_at: data.expires_at });
          
          if (onTokenReceived) {
            onTokenReceived(data);
          }
        } else {
          console.log('⏰ Token Zoom expiré, refresh nécessaire');
          await refreshToken();
        }
      } else {
        console.log('ℹ️ Aucun token Zoom trouvé');
        setIsConnected(false);
      }
    } catch (err) {
      console.error('❌ Erreur vérification token:', err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Option: Générer l'URL OAuth côté serveur (plus sécurisé)
  const connectToZoomServer = async () => {
    if (!user) {
      alert('Veuillez vous connecter d\'abord');
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Génération URL OAuth côté serveur...');

      // Appeler l'Edge Function pour générer l'URL sécurisée
      const { data, error } = await supabase.functions.invoke('generate-zoom-oauth-url', {
        body: {
          redirect_uri: REDIRECT_URI,
          scope: CENTRINOTE_ZOOM_CONFIG.scope
        }
      });

      if (error || !data?.success) {
        console.error('❌ Erreur génération URL serveur:', error);
        alert('Erreur lors de la génération de l\'URL OAuth');
        return;
      }

      console.log('✅ URL OAuth générée côté serveur:', data.url.substring(0, 100) + '...');

      // Stocker le state pour validation côté callback
      const stateData = {
        user_id: user.id,
        redirect_back: window.location.pathname,
        timestamp: data.timestamp,
        server_generated: true
      };

      sessionStorage.setItem('zoom_oauth_state', data.state);
      sessionStorage.setItem('zoom_oauth_data', JSON.stringify(stateData));

      console.log('🔄 Redirection vers URL générée côté serveur...');
      window.location.assign(data.url);

    } catch (error) {
      console.error('❌ Erreur génération URL serveur:', error);
      alert('Erreur lors de la génération de l\'URL OAuth côté serveur');
    } finally {
      setLoading(false);
    }
  };

  // Démarrer le processus OAuth Zoom avec génération dynamique d'URL (côté client)
  const connectToZoom = () => {
    if (!user) {
      alert('Veuillez vous connecter d\'abord');
      return;
    }

    if (!ZOOM_CLIENT_ID) {
      alert('❌ Configuration Zoom manquante (VITE_ZOOM_CLIENT_ID)');
      return;
    }

    console.log('🚀 Initiation OAuth Zoom pour user:', user.id);
    console.log('🔗 Redirect URI:', REDIRECT_URI);

    try {
      // Générer dynamiquement l'URL OAuth avec state unique
      const oauthData = generateZoomOAuthUrl({
        clientId: ZOOM_CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scope: CENTRINOTE_ZOOM_CONFIG.scope
      });
      
      // Stocker le state et les données utilisateur pour validation
      const stateData = { 
        user_id: user.id,
        redirect_back: window.location.pathname,
        timestamp: oauthData.timestamp,
        generated_at: new Date().toISOString()
      };
      
      // Stockage sessionStorage pour validation côté callback
      sessionStorage.setItem('zoom_oauth_state', oauthData.state);
      sessionStorage.setItem('zoom_oauth_data', JSON.stringify(stateData));

      console.log('🔐 State OAuth généré dynamiquement:', oauthData.state.substring(0, 16) + '...');
      console.log('💾 Données stockées en sessionStorage');
      console.log('📋 URL OAuth générée:', oauthData.url.substring(0, 100) + '...');

      console.log('🔄 Redirection vers Zoom OAuth...');

      // Redirection vers l'URL générée dynamiquement
      window.location.assign(oauthData.url);
      
    } catch (error) {
      console.error('❌ Erreur génération URL OAuth:', error);
      alert('Erreur lors de la génération de l\'URL OAuth Zoom');
    }
  };

  // Méthode publique pour recharger l'état depuis la DB
  const refreshConnectionState = async () => {
    if (user) {
      await checkExistingToken();
    }
  };

  // Exposer la méthode pour usage externe
  useImperativeHandle(ref, () => ({
    refreshConnectionState
  }));

  // Refresh token via Supabase Edge Function N8N proxy
  const refreshToken = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('zoom-n8n-proxy', {
        body: {
          action: 'refresh_token',
          user_id: user.id
        }
      });

      if (error) {
        console.error('❌ Erreur refresh token:', error);
        setIsConnected(false);
        return;
      }

      if (data?.success) {
        console.log('✅ Token rafraîchi avec succès');
        setIsConnected(true);
        setTokenInfo(data.token_info);
        
        if (onTokenReceived) {
          onTokenReceived(data.token_info);
        }
      } else {
        console.log('❌ Impossible de rafraîchir le token');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Déconnecter Zoom
  const disconnectZoom = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // ✅ Utilise supabase-js avec session auth
      const { error } = await supabase
        .from('zoom_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Erreur déconnexion:', error);
        return;
      }

      setIsConnected(false);
      setTokenInfo(null);
      console.log('✅ Déconnexion Zoom réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-600">Connectez-vous pour utiliser Zoom</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">🔵</span>
          Connexion Zoom OAuth
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {isConnected ? '✅ Connecté' : '⚠️ Non connecté'}
        </div>
      </div>

      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-700">🔄 Traitement en cours...</p>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-700 font-medium">✅ Zoom connecté via OAuth</p>
            {tokenInfo?.expires_at && (
              <p className="text-green-600 text-sm mt-1">
                Token valide jusqu'au {new Date(tokenInfo.expires_at).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={refreshToken}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={disconnectZoom}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              🔌 Déconnecter
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600">
            Connectez votre compte Zoom pour créer des réunions.
          </p>
          <div className="space-y-2">
            <button
              onClick={connectToZoom}
              disabled={loading || !ZOOM_CLIENT_ID}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '⏳ Connexion...' : '🔵 Connecter à Zoom (Client)'}
            </button>
            
            <button
              onClick={connectToZoomServer}
              disabled={loading || !ZOOM_CLIENT_ID}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? '⏳ Connexion...' : '🔐 Connecter à Zoom (Serveur)'}
            </button>
          </div>
          
          {!ZOOM_CLIENT_ID && (
            <p className="text-red-500 text-sm mt-2">
              ⚠️ Configuration Zoom manquante
            </p>
          )}
        </div>
      )}
    </div>
  );
});

SimpleZoomAuth.displayName = 'SimpleZoomAuth';

export default SimpleZoomAuth;
export type { ZoomAuthRef };
*/

// ⚠️ COMPOSANT DÉSACTIVÉ - UTILISER src/components/zoom/SupabaseZoomAuth.tsx
// Le nouveau composant utilise supabase.auth.signInWithOAuth({ provider: 'zoom' })
export default function SimpleZoomAuthDisabled() {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-800 font-medium">⚠️ Ancien système OAuth désactivé</p>
      <p className="text-red-600 text-sm mt-1">
        Utilisez SupabaseZoomAuth.tsx pour l'authentification Zoom via Supabase OAuth
      </p>
    </div>
  );
}