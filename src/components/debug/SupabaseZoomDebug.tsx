// 🔍 Composant de diagnostic pour Supabase OAuth Zoom
// Remplace ZoomConfigurationDebug.tsx pour le nouveau système
// ========================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { isZoomConnected, getZoomTokensFromSession } from '../../services/supabaseZoomAuth';

interface SupabaseZoomDebugState {
  supabaseUrl: string;
  isAuthenticated: boolean;
  zoomProvider: boolean;
  tokens: any;
  user: any;
  session: any;
  error: string | null;
}

export const SupabaseZoomDebug: React.FC = () => {
  const [state, setState] = useState<SupabaseZoomDebugState>({
    supabaseUrl: '',
    isAuthenticated: false,
    zoomProvider: false,
    tokens: null,
    user: null,
    session: null,
    error: null
  });

  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkSupabaseZoomState();
  }, []);

  const checkSupabaseZoomState = async () => {
    try {
      // Vérifier configuration Supabase
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'NON_CONFIGURÉ';
      
      // Vérifier session utilisateur
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      // Vérifier connexion Zoom
      const zoomConnected = await isZoomConnected();
      let zoomTokens = null;
      
      if (zoomConnected) {
        zoomTokens = await getZoomTokensFromSession();
      }

      // Vérifier si provider Zoom disponible
      const zoomProvider = session?.user?.app_metadata?.provider === 'zoom' || 
                          session?.user?.identities?.some(id => id.provider === 'zoom') || false;

      setState({
        supabaseUrl,
        isAuthenticated: !!user,
        zoomProvider,
        tokens: zoomTokens,
        user,
        session,
        error: sessionError?.message || userError?.message || null
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  };

  const testZoomAuth = async () => {
    setTesting(true);
    try {
      // Tester authentification Zoom via Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'zoom',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'meeting:write meeting:read user:read recording:read'
        }
      });

      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
      } else {
        console.log('✅ Authentification Zoom initiée:', data);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur test auth'
      }));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="mr-2">🔍</span>
          Diagnostic Supabase OAuth Zoom
        </h2>
        <p className="text-gray-600">
          Nouveau système d'authentification via Supabase OAuth
        </p>
      </div>

      {/* Configuration Supabase */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">🔧 Configuration Supabase</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">URL Supabase:</span>
            <p className={`${state.supabaseUrl === 'NON_CONFIGURÉ' ? 'text-red-600' : 'text-green-600'}`}>
              {state.supabaseUrl}
            </p>
          </div>
          <div>
            <span className="font-medium">OAuth Redirect:</span>
            <p className="text-green-600 text-xs">
              {state.supabaseUrl !== 'NON_CONFIGURÉ' 
                ? `${state.supabaseUrl}/auth/v1/callback`
                : 'URL Supabase requise'
              }
            </p>
          </div>
        </div>
      </div>

      {/* État authentification */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">👤 État de l'authentification</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className={`p-3 rounded ${state.isAuthenticated ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className="font-medium">Utilisateur connecté:</span>
            <p className={state.isAuthenticated ? 'text-green-700' : 'text-red-700'}>
              {state.isAuthenticated ? '✅ Connecté' : '❌ Non connecté'}
            </p>
            {state.user && (
              <p className="text-xs text-gray-600 mt-1">
                {state.user.email}
              </p>
            )}
          </div>
          
          <div className={`p-3 rounded ${state.zoomProvider ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <span className="font-medium">Provider Zoom:</span>
            <p className={state.zoomProvider ? 'text-green-700' : 'text-yellow-700'}>
              {state.zoomProvider ? '✅ Actif' : '⚠️ Non détecté'}
            </p>
          </div>
          
          <div className={`p-3 rounded ${state.tokens ? 'bg-green-100' : 'bg-gray-100'}`}>
            <span className="font-medium">Tokens Zoom:</span>
            <p className={state.tokens ? 'text-green-700' : 'text-gray-700'}>
              {state.tokens ? '✅ Disponibles' : '➖ Absents'}
            </p>
            {state.tokens && (
              <p className="text-xs text-gray-600 mt-1">
                Expire: {state.tokens.expires_at ? new Date(state.tokens.expires_at * 1000).toLocaleDateString() : 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Détails techniques */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">🔧 Détails techniques</h3>
        
        {state.session && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Session Supabase:</h4>
            <pre className="bg-gray-800 text-green-400 text-xs p-3 rounded overflow-x-auto">
              {JSON.stringify({
                provider_token: state.session.provider_token ? '[PRÉSENT]' : null,
                provider_refresh_token: state.session.provider_refresh_token ? '[PRÉSENT]' : null,
                expires_at: state.session.expires_at,
                user_id: state.session.user?.id
              }, null, 2)}
            </pre>
          </div>
        )}

        {state.tokens && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Tokens Zoom:</h4>
            <pre className="bg-gray-800 text-blue-400 text-xs p-3 rounded overflow-x-auto">
              {JSON.stringify(state.tokens, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Erreurs */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">❌ Erreur</h3>
          <p className="text-red-700 text-sm">{state.error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-4">
        <button
          onClick={checkSupabaseZoomState}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          🔄 Actualiser
        </button>
        
        <button
          onClick={testZoomAuth}
          disabled={testing || state.supabaseUrl === 'NON_CONFIGURÉ'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {testing ? '⏳ Test...' : '🔵 Tester Auth Zoom'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Instructions</h3>
        <div className="text-yellow-800 text-sm space-y-1">
          <p>1. ✅ Vérifiez que le provider Zoom est activé dans Supabase Dashboard</p>
          <p>2. ✅ Configurez ZOOM_CLIENT_ID et ZOOM_CLIENT_SECRET dans Supabase</p>
          <p>3. ✅ Dans votre app Zoom, utilisez: <code className="bg-yellow-200 px-1 rounded">{state.supabaseUrl}/auth/v1/callback</code></p>
          <p>4. 🔵 Cliquez "Tester Auth Zoom" pour initier l'authentification</p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseZoomDebug;