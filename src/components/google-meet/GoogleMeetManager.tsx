// 🎯 Gestionnaire principal Google Meet - Interface complète
// Composant central pour gérer toutes les fonctionnalités Google Meet
// ====================================================================

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Settings, Users, Clock, Video, ExternalLink } from 'lucide-react';
import { GoogleMeetOAuthButton } from './GoogleMeetOAuthButton';
import { GoogleMeetConnectionStatus } from './GoogleMeetConnectionStatus';
import { CreateMeetingForm } from './CreateMeetingForm';
import { MeetingsList } from './MeetingsList';
import { useGoogleMeet } from '../../hooks/useGoogleMeet';
import { useApp } from '../../contexts/AppContext';
import { GoogleCalendarEvent } from '../../types/google-meet';

export const GoogleMeetManager: React.FC = () => {
  const { state } = useApp();
  const { darkMode } = state;
  
  // Utiliser le hook centralisé pour l'état de connexion
  const { isConnected, isLoading, createMeeting, getMeetings, sendTokensToN8n } = useGoogleMeet();
  
  const [activeView, setActiveView] = useState<'overview' | 'create' | 'meetings' | 'settings'>('overview');
  const [meetings, setMeetings] = useState<GoogleCalendarEvent[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Charger les réunions si connecté
  useEffect(() => {
    if (isConnected && activeView === 'meetings') {
      loadMeetings();
    }
  }, [isConnected, activeView]);

  const loadMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const fetchedMeetings = await getMeetings(20);
      setMeetings(fetchedMeetings);
    } catch (err) {
      console.error('❌ Erreur chargement réunions:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleConnectionSuccess = async (session: any) => {
    console.log('✅ Connexion Google Meet réussie:', session);
    
    // Envoyer automatiquement les tokens à n8n
    try {
      await sendTokensToN8n();
      console.log('✅ Tokens Google envoyés à n8n');
    } catch (err) {
      console.error('❌ Erreur envoi tokens Google n8n:', err);
    }
  };

  const handleConnectionError = (error: string) => {
    console.error('❌ Erreur connexion Google Meet:', error);
  };

  const handleDisconnect = () => {
    console.log('🔄 Déconnexion Google Meet');
    setActiveView('overview');
  };

  const handleMeetingCreated = (meeting: GoogleCalendarEvent) => {
    console.log('✅ Nouvelle réunion créée:', meeting);
    setMeetings(prev => [meeting, ...prev]);
    setActiveView('meetings');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chargement de l'interface Google Meet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
          <Video className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Google Meet
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Créez et gérez vos réunions Google Meet directement depuis Centrinote
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      {isConnected && (
        <div className="flex justify-center">
          <div className={`inline-flex rounded-xl p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Calendar },
              { id: 'create', label: 'Créer', icon: Plus },
              { id: 'meetings', label: 'Mes réunions', icon: Users },
              { id: 'settings', label: 'Paramètres', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : darkMode
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection Status */}
      <GoogleMeetConnectionStatus 
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
              Connectez votre compte Google pour créer des réunions Meet, gérer votre calendrier et accéder à toutes les fonctionnalités.
            </p>
            
            <GoogleMeetOAuthButton
              onSuccess={handleConnectionSuccess}
              onError={handleConnectionError}
              size="lg"
              variant="primary"
            />
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Calendar className={`w-8 h-8 mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Planification
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Créez et planifiez vos réunions Meet directement depuis Centrinote
              </p>
            </div>
            
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Users className={`w-8 h-8 mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Collaboration
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Invitez des participants et gérez vos réunions facilement
              </p>
            </div>
            
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Settings className={`w-8 h-8 mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
              <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Automatisation
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Intégration avec n8n pour automatiser vos workflows
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* State: Connected - Show different views */
        <div className="space-y-6">
          {activeView === 'overview' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                onClick={() => setActiveView('create')}
                className={`
                  p-6 rounded-xl border-2 border-dashed transition-all duration-200
                  ${darkMode 
                    ? 'border-green-600 bg-green-900/20 hover:bg-green-900/30' 
                    : 'border-green-300 bg-green-50/50 hover:bg-green-50'
                  }
                  hover:scale-105 active:scale-95
                `}
              >
                <Plus className={`w-8 h-8 mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Nouvelle réunion
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Créer une réunion Google Meet
                </p>
              </button>

              <button 
                onClick={() => setActiveView('meetings')}
                className={`
                  p-6 rounded-xl border transition-all duration-200
                  ${darkMode 
                    ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                  hover:scale-105 active:scale-95
                `}
              >
                <Calendar className={`w-8 h-8 mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Mes réunions
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Voir et gérer vos réunions
                </p>
              </button>

              <button 
                onClick={() => setActiveView('settings')}
                className={`
                  p-6 rounded-xl border transition-all duration-200
                  ${darkMode 
                    ? 'border-gray-700 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                  }
                  hover:scale-105 active:scale-95
                `}
              >
                <Settings className={`w-8 h-8 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Configuration
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Paramètres Google Meet
                </p>
              </button>
            </div>
          )}

          {activeView === 'create' && (
            <CreateMeetingForm 
              onMeetingCreated={handleMeetingCreated}
              darkMode={darkMode}
            />
          )}

          {activeView === 'meetings' && (
            <MeetingsList 
              meetings={meetings}
              loading={loadingMeetings}
              onRefresh={loadMeetings}
              darkMode={darkMode}
            />
          )}

          {activeView === 'settings' && (
            <div className={`
              p-6 rounded-xl border
              ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            `}>
              <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Paramètres Google Meet
              </h3>
              <div className="space-y-4">
                <div className={`
                  p-4 rounded-xl border
                  ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}
                `}>
                  <div className="flex items-center space-x-2">
                    <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      Google Meet connecté et prêt
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-green-500' : 'text-green-600'}`}>
                    Vos tokens sont synchronisés avec n8n pour l'automatisation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className={`
            p-4 rounded-xl border
            ${darkMode 
              ? 'border-green-700 bg-green-900/20' 
              : 'border-green-200 bg-green-50'
            }
          `}>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Google Meet est connecté et prêt à l'utilisation
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