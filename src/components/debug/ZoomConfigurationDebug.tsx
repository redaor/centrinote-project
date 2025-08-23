/**
 * Composant de diagnostic pour la configuration Zoom OAuth
 */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

interface ZoomConfig {
  clientId: string;
  redirectUri: string;
  currentUrl: string;
  expectedRedirectUri: string;
  authUrl?: string;
}

export const ZoomConfigurationDebug: React.FC = () => {
  const [config, setConfig] = useState<ZoomConfig | null>(null);
  const [authTest, setAuthTest] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    result?: any;
    error?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    // Charger la configuration Zoom depuis les variables d'environnement
    const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID || 'NON_CONFIGURÉ';
    const redirectUri = import.meta.env.VITE_ZOOM_REDIRECT_URI || 'NON_CONFIGURÉ';
    const currentUrl = window.location.origin;
    const expectedRedirectUri = `https://03526871154.ngrok-free.app/auth/callback`;

    setConfig({
      clientId,
      redirectUri,
      currentUrl,
      expectedRedirectUri
    });
  }, []);

  const testAuthUrlGeneration = async () => {
    setAuthTest({ status: 'loading' });
    
    try {
      const response = await apiClient.get('/auth/zoom');
      setAuthTest({ 
        status: 'success', 
        result: response 
      });
    } catch (error) {
      setAuthTest({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      });
    }
  };

  const getConfigStatus = (current: string, expected: string) => {
    return current === expected ? 'correct' : 'incorrect';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correct': return '✅';
      case 'incorrect': return '❌';
      default: return '⚠️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct': return 'text-green-600';
      case 'incorrect': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  if (!config) return <div>Chargement de la configuration...</div>;

  const redirectUriStatus = getConfigStatus(config.redirectUri, config.expectedRedirectUri);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        🔍 Diagnostic Configuration Zoom OAuth
      </h2>

      {/* Configuration actuelle */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">📋 Configuration Actuelle</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🔑</span>
            <div className="flex-1">
              <p className="font-medium">Client ID:</p>
              <p className="text-sm text-gray-600 font-mono">
                {config.clientId.substring(0, 10)}...
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">{getStatusIcon(redirectUriStatus)}</span>
            <div className="flex-1">
              <p className="font-medium">Redirect URI (configuré):</p>
              <p className={`text-sm font-mono ${getStatusColor(redirectUriStatus)}`}>
                {config.redirectUri}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">🎯</span>
            <div className="flex-1">
              <p className="font-medium">Redirect URI (attendu):</p>
              <p className="text-sm font-mono text-green-600">
                {config.expectedRedirectUri}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">🌐</span>
            <div className="flex-1">
              <p className="font-medium">URL actuelle du frontend:</p>
              <p className="text-sm font-mono text-blue-600">
                {config.currentUrl}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test de génération d'URL OAuth */}
      <div className="mb-8 p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🧪 Test de Génération d'URL OAuth</h3>
          <button
            onClick={testAuthUrlGeneration}
            disabled={authTest.status === 'loading'}
            className={`px-4 py-2 rounded-md font-medium ${
              authTest.status === 'loading'
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {authTest.status === 'loading' ? 'Test en cours...' : 'Tester l\'URL OAuth'}
          </button>
        </div>

        {authTest.status === 'success' && authTest.result && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded">
              <p className="text-green-800 font-medium">✅ URL OAuth générée avec succès</p>
            </div>
            <details>
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                Voir les détails de l'URL OAuth
              </summary>
              <div className="mt-2">
                <p className="font-medium mb-2">URL complète:</p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                  {authTest.result.authUrl}
                </p>
                <div className="mt-3">
                  <p className="font-medium mb-2">Paramètres extraits:</p>
                  <div className="text-sm space-y-1">
                    {(() => {
                      try {
                        const url = new URL(authTest.result.authUrl);
                        return Array.from(url.searchParams.entries()).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="font-medium w-32">{key}:</span>
                            <span className="font-mono text-gray-600">
                              {key === 'redirect_uri' ? (
                                <span className={value === config.expectedRedirectUri ? 'text-green-600' : 'text-red-600'}>
                                  {value}
                                </span>
                              ) : (
                                value
                              )}
                            </span>
                          </div>
                        ));
                      } catch (e) {
                        return <p className="text-red-600">Erreur lors du parsing de l'URL</p>;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {authTest.status === 'error' && (
          <div className="p-3 bg-red-50 rounded">
            <p className="text-red-800 font-medium">❌ Erreur lors du test</p>
            <p className="text-red-600 text-sm mt-1">{authTest.error}</p>
          </div>
        )}
      </div>

      {/* Instructions de configuration Zoom */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-3">📋 Instructions pour Zoom Marketplace</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p><strong>1. Connectez-vous à Zoom Marketplace:</strong></p>
          <p className="ml-4">🔗 <a href="https://marketplace.zoom.us/" target="_blank" rel="noopener noreferrer" className="underline">https://marketplace.zoom.us/</a></p>
          
          <p><strong>2. Naviguez vers votre application:</strong></p>
          <p className="ml-4">• Allez dans "Manage" → "Built Apps"</p>
          <p className="ml-4">• Sélectionnez votre application OAuth</p>
          
          <p><strong>3. Mettez à jour le Redirect URI:</strong></p>
          <p className="ml-4">• Allez dans l'onglet "OAuth"</p>
          <p className="ml-4">• Dans "Redirect URL for OAuth", ajoutez ou mettez à jour:</p>
          <p className="ml-6 font-mono bg-white p-2 rounded border">
            {config.expectedRedirectUri}
          </p>
          
          <p><strong>4. Sauvegardez les modifications</strong></p>
          
          {redirectUriStatus === 'incorrect' && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
              <p className="text-yellow-800 font-medium">⚠️ Configuration incorrecte détectée</p>
              <p className="text-yellow-700 text-xs mt-1">
                Votre redirect URI configuré ne correspond pas à l'URL ngrok actuelle. 
                Mettez à jour le fichier .env ET la configuration Zoom Marketplace.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoomConfigurationDebug;