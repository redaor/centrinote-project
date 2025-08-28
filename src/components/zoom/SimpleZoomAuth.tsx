import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { supabase } from '../../lib/supabase';

interface ZoomAuthProps {
  onTokenReceived?: (token: any) => void;
}

interface ZoomAuthRef {
  refreshConnectionState: () => Promise<void>;
}

const SimpleZoomAuth = forwardRef<ZoomAuthRef, ZoomAuthProps>(({ onTokenReceived }, ref) => {
  const { user } = useSupabaseAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Configuration OAuth Zoom
  const ZOOM_CLIENT_ID = import.meta.env.VITE_ZOOM_CLIENT_ID || 'XjtK5_JvQ7upfjYppAF1tw';
  const REDIRECT_URI = import.meta.env.VITE_ZOOM_REDIRECT_URI || 'https://centrinote.fr/zoom-callback';
  const SUPABASE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoom-n8n-proxy`;

  useEffect(() => {
    if (user) {
      checkExistingToken();
    }
  }, [user]);

  // Vérifier si l'utilisateur a déjà un token valide
  const checkExistingToken = async () => {
    try {
      const { data, error } = await supabase
        .from('zoom_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user?.id)
        .single();

      if (data && !error) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setIsConnected(true);
          setTokenInfo({ expires_at: data.expires_at });
        } else {
          // Token expiré, on va le refresh via n8n
          await refreshToken();
        }
      }
    } catch (err) {
      console.log('Pas de token existant:', err);
    }
  };


  // Utilitaire pour gérer les cookies avec SameSite=Lax; Secure
  const setCookie = (name: string, value: string, days = 1) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
  };

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Démarrer le processus OAuth (version originale simplifiée)
  const connectToZoom = () => {
    if (!user) {
      alert('Veuillez vous connecter d\'abord');
      return;
    }

    console.log('🚀 Début connexion Zoom pour utilisateur:', user.id);

    // Générer un state sécurisé
    const secureState = crypto.randomUUID();
    
    // Stocker le state et les données utilisateur
    const stateData = { 
      user_id: user.id,
      redirect_back: window.location.pathname,
      timestamp: Date.now()
    };
    
    // Double stockage : sessionStorage + cookie (protection contre perte)
    sessionStorage.setItem('zoom_oauth_state', secureState);
    sessionStorage.setItem('zoom_oauth_data', JSON.stringify(stateData));
    setCookie('zoom_oauth_state', secureState);
    setCookie('zoom_oauth_data', JSON.stringify(stateData));

    // Construire l'URL OAuth avec les variables d'environnement
    const oauthUrl = `https://zoom.us/oauth/authorize?` + 
      `response_type=code&` +
      `client_id=${encodeURIComponent(ZOOM_CLIENT_ID)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${encodeURIComponent(secureState)}`;

    console.log('🔐 State généré:', secureState);
    console.log('📍 Redirect URI:', REDIRECT_URI);
    console.log('🔄 Redirection vers Zoom OAuth');

    // Redirection vers Zoom
    window.location.assign(oauthUrl);
  };

  // Méthode publique pour recharger l'état depuis la DB après callback
  const refreshConnectionState = async () => {
    if (user) {
      await checkExistingToken();
    }
  };

  // Exposer la méthode pour usage externe
  useImperativeHandle(ref, () => ({
    refreshConnectionState
  }));

  // Refresh token via Supabase Edge Function (proxy N8N)
  const refreshToken = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(SUPABASE_PROXY_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'refresh_token',
          user_id: user.id
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Token rafraîchi avec succès');
        setIsConnected(true);
        setTokenInfo(result.token_info);
      } else {
        console.log('❌ Impossible de rafraîchir le token, reconnexion nécessaire');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      setIsConnected(false);
    }
  };

  // Déconnecter Zoom
  const disconnectZoom = async () => {
    if (!user) return;

    try {
      await supabase
        .from('zoom_tokens')
        .delete()
        .eq('user_id', user.id);

      setIsConnected(false);
      setTokenInfo(null);
      console.log('✅ Déconnexion Zoom réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
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
          Connexion Zoom
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
            <p className="text-green-700 font-medium">✅ Zoom connecté avec succès</p>
            {tokenInfo?.expires_at && (
              <p className="text-green-600 text-sm mt-1">
                Token valide jusqu'au {new Date(tokenInfo.expires_at).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={refreshToken}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={disconnectZoom}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
          <button
            onClick={connectToZoom}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '⏳ Connexion...' : '🔵 Connecter à Zoom'}
          </button>
        </div>
      )}
    </div>
  );
});

SimpleZoomAuth.displayName = 'SimpleZoomAuth';

export default SimpleZoomAuth;
export type { ZoomAuthRef };