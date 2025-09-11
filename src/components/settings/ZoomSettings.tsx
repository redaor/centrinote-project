// ⚙️ Composant des paramètres Zoom
// Interface de configuration Zoom dans les paramètres
// ==================================================

import React, { useState, useEffect } from 'react';
import { Video, Settings, Zap, TestTube, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { ZoomOAuthButton } from '../zoom/ZoomOAuthButton';
import { ZoomConnectionStatus } from '../zoom/ZoomConnectionStatus';
import { useZoomAuth } from '../../hooks/useZoomAuth';
import { zoomN8nIntegration } from '../../services/zoomN8nIntegration';

interface ZoomSettingsProps {
  darkMode: boolean;
}

export const ZoomSettings: React.FC<ZoomSettingsProps> = ({ darkMode }) => {
  const { isConnected, isLoading, user, error, sendTokensToN8n } = useZoomAuth();
  const [testResults, setTestResults] = useState<{
    n8n: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
  }>({ n8n: 'idle' });

  // Test de la connexion n8n
  const testN8nConnection = async () => {
    setTestResults({ n8n: 'testing' });
    
    try {
      const result = await zoomN8nIntegration.testConnection();
      
      if (result.success) {
        setTestResults({ 
          n8n: 'success', 
          message: 'Connexion n8n fonctionnelle' 
        });
      } else {
        setTestResults({ 
          n8n: 'error', 
          message: result.error || 'Erreur de connexion n8n' 
        });
      }
    } catch (err) {
      setTestResults({ 
        n8n: 'error', 
        message: err instanceof Error ? err.message : 'Erreur test n8n' 
      });
    }
    
    // Reset après 3 secondes
    setTimeout(() => {
      setTestResults({ n8n: 'idle' });
    }, 3000);
  };

  // Synchroniser avec n8n
  const syncWithN8n = async () => {
    if (!isConnected) return;
    
    try {
      const success = await sendTokensToN8n();
      if (success) {
        console.log('✅ Synchronisation n8n réussie');
      }
    } catch (err) {
      console.error('❌ Erreur synchronisation n8n:', err);
    }
  };

  const getTestIcon = (status: string) => {
    switch (status) {
      case 'testing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <TestTube className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Video className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Configuration Zoom
        </h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Gérez votre intégration Zoom et les paramètres d'automatisation
        </p>
      </div>

      {/* Connection Status */}
      <ZoomConnectionStatus 
        showUserInfo={true}
        className="max-w-2xl mx-auto"
      />

      {/* Connection Section */}
      {!isConnected && (
        <div className={`
          max-w-2xl mx-auto p-6 rounded-2xl border
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          <div className="text-center space-y-4">
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connecter Zoom
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connectez votre compte Zoom via Supabase OAuth pour accéder à toutes les fonctionnalités.
            </p>
            
            <ZoomOAuthButton
              size="lg"
              variant="primary"
              onSuccess={() => console.log('Connexion réussie')}
              onError={(err) => console.error('Erreur connexion:', err)}
            />
          </div>
        </div>
      )}

      {/* Configuration Sections */}
      {isConnected && (
        <>
          {/* N8N Integration */}
          <div className={`
            p-6 rounded-2xl border
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          `}>
            <div className="flex items-center space-x-3 mb-4">
              <Zap className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-orange-500'}`} />
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Intégration n8n
              </h3>
            </div>

            <div className="space-y-4">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Gérez l'intégration avec n8n pour les workflows automatisés d'enregistrement et de transcription.
              </p>

              {/* N8n Configuration Info */}
              <div className={`
                p-4 rounded-xl
                ${zoomN8nIntegration.isConfigured()
                  ? darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                  : darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                }
              `}>
                <div className="flex items-center space-x-2">
                  {zoomN8nIntegration.isConfigured() ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        n8n configuré
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                        n8n non configuré
                      </span>
                    </>
                  )}
                </div>
                
                {zoomN8nIntegration.isConfigured() && (
                  <div className={`text-xs mt-1 ${darkMode ? 'text-green-500' : 'text-green-600'}`}>
                    Webhook URL: {zoomN8nIntegration.getConfiguration().webhook_url}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={testN8nConnection}
                  disabled={testResults.n8n === 'testing'}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${darkMode 
                      ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {getTestIcon(testResults.n8n)}
                  <span>Tester n8n</span>
                </button>

                <button
                  onClick={syncWithN8n}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Synchroniser</span>
                </button>
              </div>

              {testResults.message && (
                <div className={`
                  text-sm p-2 rounded
                  ${testResults.n8n === 'success' 
                    ? darkMode ? 'text-green-400 bg-green-900/20' : 'text-green-700 bg-green-50'
                    : darkMode ? 'text-red-400 bg-red-900/20' : 'text-red-700 bg-red-50'
                  }
                `}>
                  {testResults.message}
                </div>
              )}
            </div>
          </div>

          {/* User Information */}
          {user && (
            <div className={`
              p-6 rounded-2xl border
              ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            `}>
              <div className="flex items-center space-x-3 mb-4">
                <Settings className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Informations du compte
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nom:</span>
                  <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.display_name || `${user.first_name} ${user.last_name}`}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email:</span>
                  <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.email}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type:</span>
                  <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.type === 1 ? 'Basic' : user.type === 2 ? 'Licensed' : 'On-premise'}
                  </span>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Timezone:</span>
                  <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {user.timezone}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className={`
          max-w-2xl mx-auto p-4 rounded-xl border
          ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}
        `}>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Erreur</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};