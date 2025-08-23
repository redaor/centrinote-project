import React, { useEffect, useRef, useState } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MessageCircle,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { jitsiService, JitsiMeetingRoom } from '../../services/jitsiService';
import { useApp } from '../../contexts/AppContext';

interface JitsiMeetingProps {
  room: JitsiMeetingRoom;
  onLeave: () => void;
}

export function JitsiMeeting({ room, onLeave }: JitsiMeetingProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJitsiLoaded, setIsJitsiLoaded] = useState(false);
  const [meetingStats, setMeetingStats] = useState({
    participants: 0,
    duration: 0,
    isRecording: false
  });
  const [showShareModal, setShowShareModal] = useState(false);

  // Charger le script Jitsi Meet
  useEffect(() => {
    const loadJitsiScript = () => {
      // Vérifier si le script est déjà chargé
      if ((window as any).JitsiMeetExternalAPI) {
        setIsJitsiLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('Jitsi Meet API chargée');
        setIsJitsiLoaded(true);
      };
      script.onerror = () => {
        setError('Impossible de charger Jitsi Meet. Vérifiez votre connexion internet.');
      };
      
      document.head.appendChild(script);
    };

    loadJitsiScript();
  }, []);

  // Initialiser la réunion Jitsi
  useEffect(() => {
    if (!isJitsiLoaded || !jitsiContainerRef.current || !user) return;

    const initializeMeeting = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Vérifier la compatibilité du navigateur
        const compatibility = jitsiService.checkBrowserCompatibility();
        if (!compatibility.compatible) {
          throw new Error(`Navigateur non compatible: ${compatibility.issues.join(', ')}`);
        }

        // Tester les permissions média
        const permissions = await jitsiService.testMediaPermissions();
        if (!permissions.camera && !permissions.microphone) {
          console.warn('Permissions caméra/microphone non accordées:', permissions.error);
        }

        // Initialiser l'API Jitsi
        const api = await jitsiService.initializeJitsiAPI('jitsi-container', {
          ...room.config,
          displayName: user.name,
          email: user.email
        });

        // Configurer les événements spécifiques
        api.addEventListener('videoConferenceJoined', () => {
          setIsLoading(false);
          setMeetingStats(prev => ({ ...prev, participants: prev.participants + 1 }));
        });

        api.addEventListener('participantJoined', () => {
          setMeetingStats(prev => ({ ...prev, participants: prev.participants + 1 }));
        });

        api.addEventListener('participantLeft', () => {
          setMeetingStats(prev => ({ ...prev, participants: Math.max(0, prev.participants - 1) }));
        });

        api.addEventListener('recordingStatusChanged', (event: any) => {
          setMeetingStats(prev => ({ ...prev, isRecording: event.on }));
        });

        api.addEventListener('errorOccurred', (event: any) => {
          console.error('Erreur Jitsi:', event);
          setError(`Erreur de connexion: ${event.error?.message || 'Erreur inconnue'}`);
        });

        console.log('Réunion Jitsi initialisée avec succès');

      } catch (err) {
        console.error('Erreur lors de l\'initialisation de Jitsi:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'initialisation de la réunion');
        setIsLoading(false);
      }
    };

    initializeMeeting();

    // Nettoyage lors du démontage
    return () => {
      jitsiService.leaveMeeting();
    };
  }, [isJitsiLoaded, room, user]);

  // Gestionnaire de sortie
  const handleLeave = () => {
    jitsiService.leaveMeeting();
    onLeave();
  };

  // Copier le lien de partage
  const handleCopyShareLink = () => {
    const shareLink = jitsiService.generateShareableLink(room);
    navigator.clipboard.writeText(shareLink);
  };

  // Ouvrir dans un nouvel onglet
  const handleOpenInNewTab = () => {
    const shareLink = jitsiService.generateShareableLink(room);
    window.open(shareLink, '_blank');
  };

  // Affichage d'erreur
  if (error) {
    return (
      <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          border-b px-6 py-4 flex items-center justify-between
        `}>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLeave}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Retour</span>
            </button>
          </div>
          
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Erreur de connexion
          </h2>
          
          <div></div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className={`
            ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
            rounded-lg p-8 text-center max-w-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-4">Impossible de rejoindre la réunion</h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={handleLeave}
                className={`
                  w-full px-4 py-2 rounded-lg border transition-colors
                  ${darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Retour à la collaboration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border-b px-6 py-4 flex items-center justify-between
      `}>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleLeave}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quitter</span>
          </button>
          
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {room.name}
          </h2>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{meetingStats.participants} participants</span>
            </div>
            
            {room.config.enableE2EE && (
              <div className="flex items-center space-x-1 text-green-500">
                <Shield className="w-4 h-4" />
                <span>E2EE</span>
              </div>
            )}
            
            {meetingStats.isRecording && (
              <div className="flex items-center space-x-1 text-red-500">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Enregistrement</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowShareModal(true)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Partager</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className={`
              ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
              rounded-lg p-8 text-center border ${darkMode ? 'border-gray-700' : 'border-gray-200'}
            `}>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Connexion en cours...</h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Initialisation de la réunion sécurisée
              </p>
            </div>
          </div>
        )}
        
        {/* Container Jitsi */}
        <div 
          id="jitsi-container" 
          ref={jitsiContainerRef}
          className="w-full h-full"
        />
      </div>

      {/* Modal de partage */}
      {showShareModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowShareModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96
          `}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Partager la réunion
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <ArrowLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Lien de la réunion
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={jitsiService.generateShareableLink(room)}
                    readOnly
                    className={`
                      flex-1 px-3 py-2 rounded-l-lg border text-sm
                      ${darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                      }
                    `}
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {room.password && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mot de passe
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={room.password}
                      readOnly
                      className={`
                        flex-1 px-3 py-2 rounded-l-lg border text-sm
                        ${darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                        }
                      `}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(room.password!)}
                      className="px-3 py-2 bg-teal-500 text-white rounded-r-lg hover:bg-teal-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Nouvel onglet</span>
                </button>
              </div>
              
              {/* Informations de sécurité */}
              <div className={`
                ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}
                border rounded-lg p-3
              `}>
                <div className="flex items-center space-x-2">
                  <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-800'}`}>
                    Réunion sécurisée
                  </span>
                </div>
                <ul className={`text-xs mt-2 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
                  {room.config.enableE2EE && <li>• Chiffrement de bout en bout activé</li>}
                  <li>• Connexion HTTPS sécurisée</li>
                  <li>• Serveurs Jitsi Meet officiels</li>
                  {room.password && <li>• Protection par mot de passe</li>}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}