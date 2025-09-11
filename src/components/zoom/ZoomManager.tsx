// 🎯 Gestionnaire principal Zoom - Interface complète
// Composant central pour gérer toutes les fonctionnalités Zoom
// ===========================================================

import React from 'react';
import { Video, Plus, Settings, Users, Calendar } from 'lucide-react';
import { ZoomOAuthButton } from './ZoomOAuthButton';
import { ZoomConnectionStatus } from './ZoomConnectionStatus';
import { zoomOAuthService } from '../../services/zoomOAuthService';
import { useApp } from '../../contexts/AppContext';
import { useZoomAuth } from '../../hooks/useZoomAuth';

export const ZoomManager: React.FC = () => {
  const { state } = useApp();
  const { darkMode } = state;
  
  // Utiliser le hook centralisé pour l'état de connexion
  const { isConnected, isLoading } = useZoomAuth();

  const handleConnectionSuccess = async (session: any) => {
    console.log('✅ Connexion Zoom réussie:', session);
    // L'état sera automatiquement mis à jour par useZoomAuth
    
    // Envoyer automatiquement les tokens à n8n
    try {
      await zoomOAuthService.sendTokensToN8n();
      console.log('✅ Tokens envoyés à n8n');
    } catch (err) {
      console.error('❌ Erreur envoi tokens n8n:', err);
    }
  };

  const handleConnectionError = (error: string) => {
    console.error('❌ Erreur connexion Zoom:', error);
  };

  const handleDisconnect = () => {
    // L'état sera automatiquement mis à jour par useZoomAuth
    console.log('🔄 Déconnexion déléguée à useZoomAuth');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chargement de l'interface Zoom...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <Video className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Gestion Zoom
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connectez votre compte Zoom pour accéder aux fonctionnalités de visioconférence
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <ZoomConnectionStatus 
        onDisconnect={handleDisconnect}
        showUserInfo={true}
        className="max-w-2xl mx-auto"
      />

      {/* Main Content */}
      {!isConnected ? (
        /* State: Not Connected */
        <div className="text-center space-y-6">
          <div className={`
            max-w-md mx-auto p-6 rounded-2xl border-2 border-dashed
            ${darkMode 
              ? 'border-gray-600 bg-gray-800/50' 
              : 'border-gray-300 bg-gray-50/50'
            }
          `}>
            <Video className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connexion requise
            </h3>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connectez votre compte Zoom pour créer des réunions, gérer les enregistrements et accéder à toutes les fonctionnalités.
            </p>
            
            <ZoomOAuthButton
              onSuccess={handleConnectionSuccess}
              onError={handleConnectionError}
              size="lg"
              variant="primary"
            />
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Calendar className={`w-8 h-8 mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Planification
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Créez et planifiez vos réunions directement depuis Centrinote
              </p>
            </div>
            
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Users className={`w-8 h-8 mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Gestion
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Gérez vos participants et paramètres de réunion
              </p>
            </div>
            
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Video className={`w-8 h-8 mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Automatisation
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Enregistrements automatiques et intégration avec vos notes
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* State: Connected */
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className={`
              p-6 rounded-xl border-2 border-dashed transition-all duration-200
              ${darkMode 
                ? 'border-blue-600 bg-blue-900/20 hover:bg-blue-900/30' 
                : 'border-blue-300 bg-blue-50/50 hover:bg-blue-50'
              }
              hover:scale-105 active:scale-95
            `}>
              <Plus className={`w-8 h-8 mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Nouvelle réunion
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Créer une réunion Zoom
              </p>
            </button>

            <button className={`
              p-6 rounded-xl border transition-all duration-200
              ${darkMode 
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' 
                : 'border-gray-200 bg-white hover:bg-gray-50'
              }
              hover:scale-105 active:scale-95
            `}>
              <Calendar className={`w-8 h-8 mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Réunions planifiées
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Voir vos réunions
              </p>
            </button>

            <button className={`
              p-6 rounded-xl border transition-all duration-200
              ${darkMode 
                ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' 
                : 'border-gray-200 bg-white hover:bg-gray-50'
              }
              hover:scale-105 active:scale-95
            `}>
              <Settings className={`w-8 h-8 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Configuration
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Paramètres Zoom
              </p>
            </button>
          </div>

          {/* Quick Info */}
          <div className={`
            p-4 rounded-xl border
            ${darkMode 
              ? 'border-green-700 bg-green-900/20' 
              : 'border-green-200 bg-green-50'
            }
          `}>
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Zoom est connecté et prêt à l'utilisation
              </span>
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-green-500' : 'text-green-600'}`}>
              Vos tokens sont automatiquement synchronisés avec n8n pour les workflows automatisés.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};