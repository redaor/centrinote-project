import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  ExternalLink,
  FileText,
  Clock
} from 'lucide-react';
import { jitsiService, JitsiMeetingRoom } from '../../services/jitsiService';
import { useApp } from '../../contexts/AppContext';
import { RecordingControls } from './RecordingControls';
import { ConsentDialog } from './ConsentDialog';
import { ReportsList } from './ReportsList';
import { 
  RecordingStatus, 
  RecordingConfig, 
  RecordingConsent, 
  GeneratedReport,
  RecordingEventType 
} from '../../types/recording';

interface JitsiMeetingProps {
  room: JitsiMeetingRoom;
  onLeave: () => void;
  sessionDocumentIds?: string[];
  sessionType?: string;
}

export function JitsiMeeting({ 
  room, 
  onLeave, 
  sessionDocumentIds = [], 
  sessionType = 'video' 
}: JitsiMeetingProps) {
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

  // ========================================
  // 🎬 NOUVEAUX ÉTATS POUR L'ENREGISTREMENT
  // ========================================
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    status: 'idle',
    participantConsents: [],
    allParticipantsConsented: false,
    consentPending: []
  });

  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>({
    autoStart: false,
    requireConsent: true,
    saveToCloud: true,
    generateReport: true,
    n8nWebhookUrl: import.meta.env.VITE_N8N_JITSI_WEBHOOK || '',
    storageProvider: 'drive',
    maxDuration: 120,
    quality: 'high',
    includeScreenShare: true,
    includeChat: true
  });

  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [recordingDurationTimer, setRecordingDurationTimer] = useState<NodeJS.Timeout | null>(null);

  // Participants simulés (en production, viendrait de l'API Jitsi)
  const [participants, setParticipants] = useState<Array<{
    id: string;
    name: string;
    email?: string;
    joinedAt: Date;
  }>>([
    { 
      id: 'current-user', 
      name: user?.name || 'Utilisateur', 
      email: user?.email,
      joinedAt: new Date() 
    }
  ]);

  // ========================================
  // 🎬 NOUVELLES MÉTHODES D'ENREGISTREMENT
  // ========================================

  /**
   * 🎬 Démarrer l'enregistrement avec gestion consentement
   */
  const handleStartRecording = useCallback(async () => {
    if (!user || recordingStatus.isRecording) return;

    try {
      setRecordingStatus(prev => ({ ...prev, status: 'starting' }));

      // Vérifier les consentements si requis
      if (recordingConfig.requireConsent && !recordingStatus.allParticipantsConsented) {
        setShowConsentDialog(true);
        setRecordingStatus(prev => ({ ...prev, status: 'idle' }));
        return;
      }

      // Démarrer l'enregistrement via le service
      const result = await jitsiService.startRecording(room.name, {
        participants: participants,
        documentIds: sessionDocumentIds,
        sessionType: sessionType,
        organizerId: user.id,
        organizerName: user.name,
        requireConsent: recordingConfig.requireConsent
      });

      if (result.success) {
        setCurrentRecordingId(result.recordingId || null);
        setStartTime(new Date());
        setRecordingStatus(prev => ({
          ...prev,
          isRecording: true,
          status: 'recording',
          recordingId: result.recordingId,
          startTime: new Date()
        }));
        setMeetingStats(prev => ({ ...prev, isRecording: true }));

        // Démarrer le timer de durée
        const timer = setInterval(() => {
          setRecordingStatus(prev => ({
            ...prev,
            duration: startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0
          }));
        }, 1000);
        setRecordingDurationTimer(timer);

      } else {
        setRecordingStatus(prev => ({ 
          ...prev, 
          status: 'error', 
          error: result.error 
        }));
      }
    } catch (error) {
      console.error('❌ Erreur démarrage enregistrement:', error);
      setRecordingStatus(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  }, [user, recordingStatus, recordingConfig, room.name, participants, sessionDocumentIds, sessionType, startTime]);

  /**
   * ⏹️ Arrêter l'enregistrement
   */
  const handleStopRecording = useCallback(async () => {
    if (!recordingStatus.isRecording || !currentRecordingId) return;

    try {
      setRecordingStatus(prev => ({ ...prev, status: 'stopping' }));

      const duration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
      
      const result = await jitsiService.stopRecording(
        room.name,
        currentRecordingId,
        duration
      );

      if (result.success) {
        setRecordingStatus(prev => ({
          ...prev,
          isRecording: false,
          status: 'processing',
          recordingUrl: result.recordingUrl
        }));
        setMeetingStats(prev => ({ ...prev, isRecording: false }));

        // Arrêter le timer
        if (recordingDurationTimer) {
          clearInterval(recordingDurationTimer);
          setRecordingDurationTimer(null);
        }

        // Déclencher génération rapports après traitement
        setTimeout(() => {
          handleRefreshReports();
        }, 5000);

      } else {
        setRecordingStatus(prev => ({ 
          ...prev, 
          status: 'error', 
          error: result.error 
        }));
      }
    } catch (error) {
      console.error('❌ Erreur arrêt enregistrement:', error);
      setRecordingStatus(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }));
    }
  }, [recordingStatus.isRecording, currentRecordingId, room.name, startTime, recordingDurationTimer]);

  /**
   * ✅ Gérer le consentement utilisateur
   */
  const handleConsentResponse = useCallback(async (hasConsented: boolean) => {
    if (!user) return;

    try {
      // Enregistrer le consentement
      await jitsiService.recordConsent(
        room.name,
        user.id,
        user.name,
        hasConsented,
        'explicit'
      );

      // Mettre à jour l'état local
      setRecordingStatus(prev => {
        const updatedConsents = prev.participantConsents.filter(
          c => c.participantId !== user.id
        );
        updatedConsents.push({
          participantId: user.id,
          participantName: user.name,
          hasConsented,
          timestamp: new Date(),
          consentMethod: 'explicit'
        });

        const consentPending = participants
          .filter(p => !updatedConsents.find(c => c.participantId === p.id && c.hasConsented))
          .map(p => p.id);

        return {
          ...prev,
          participantConsents: updatedConsents,
          allParticipantsConsented: consentPending.length === 0,
          consentPending
        };
      });

      setShowConsentDialog(false);

      // Si consentement accordé et tous les participants ont consenti, démarrer l'enregistrement
      if (hasConsented) {
        // Vérifier si tous ont consenti
        const allConsented = participants.every(p => 
          recordingStatus.participantConsents.find(c => 
            c.participantId === p.id && c.hasConsented
          ) || p.id === user.id
        );

        if (allConsented) {
          setTimeout(() => {
            handleStartRecording();
          }, 1000);
        }
      }

    } catch (error) {
      console.error('❌ Erreur enregistrement consentement:', error);
    }
  }, [user, room.name, participants, recordingStatus.participantConsents, handleStartRecording]);

  /**
   * 📄 Rafraîchir les rapports générés
   */
  const handleRefreshReports = useCallback(async () => {
    try {
      const result = await jitsiService.getGeneratedReports(room.name);
      
      if (result.success && result.reports) {
        const mappedReports: GeneratedReport[] = result.reports.map(report => ({
          id: report.id,
          sessionId: room.id,
          roomName: room.name,
          title: `${getReportTypeLabel(report.type)} - ${room.name}`,
          generatedAt: report.generatedAt,
          status: report.status as 'generating' | 'completed' | 'error',
          type: report.type as 'transcript' | 'summary' | 'action_items' | 'full_report',
          fileUrl: report.fileUrl,
          metadata: {
            duration: Math.floor((recordingStatus.duration || 0) / 60),
            participantCount: participants.length
          }
        }));
        
        setGeneratedReports(mappedReports);
      }
    } catch (error) {
      console.error('❌ Erreur récupération rapports:', error);
    }
  }, [room.name, room.id, recordingStatus.duration, participants.length]);

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'transcript': return 'Transcription';
      case 'summary': return 'Résumé';
      case 'action_items': return 'Actions';
      case 'full_report': return 'Rapport complet';
      default: return 'Rapport';
    }
  };

  /**
   * 📥 Télécharger un rapport
   */
  const handleDownloadReport = useCallback((report: GeneratedReport) => {
    if (report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    }
  }, []);

  // Calculer les permissions d'enregistrement
  const canStartRecording = useMemo(() => {
    return user && 
           !recordingStatus.isRecording && 
           recordingStatus.status === 'idle' &&
           (!recordingConfig.requireConsent || recordingStatus.allParticipantsConsented);
  }, [user, recordingStatus, recordingConfig.requireConsent]);

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
    console.log('🔄 [AUDIT] JitsiMeeting useEffect triggered:', {
      isJitsiLoaded,
      hasContainerRef: !!jitsiContainerRef.current,
      user: !!user,
      userName: user?.name,
      roomName: room?.name,
      roomConfig: room?.config
    });

    if (!isJitsiLoaded || !jitsiContainerRef.current || !user) {
      console.log('⏭️ [AUDIT] JitsiMeeting prerequisites not ready:', {
        isJitsiLoaded,
        hasContainerRef: !!jitsiContainerRef.current,
        user: !!user
      });
      return;
    }

    const initializeMeeting = async () => {
      try {
        console.log('🚀 [AUDIT] Starting Jitsi meeting initialization...');
        setIsLoading(true);
        setError(null);

        // Double vérification que le container DOM existe
        const container = document.getElementById('jitsi-container');
        console.log('🔍 [AUDIT] DOM container verification:', {
          containerFound: !!container,
          containerElement: container,
          refCurrent: jitsiContainerRef.current,
          containerDimensions: container ? {
            width: container.offsetWidth,
            height: container.offsetHeight,
            visible: container.offsetParent !== null
          } : null
        });

        if (!container) {
          console.error('❌ [AUDIT] Container jitsi-container not found in DOM!');
          throw new Error('Container DOM introuvable');
        }

        // Vérifier la compatibilité du navigateur
        console.log('🔍 [AUDIT] Checking browser compatibility...');
        const compatibility = jitsiService.checkBrowserCompatibility();
        console.log('🔍 [AUDIT] Browser compatibility result:', compatibility);
        if (!compatibility.compatible) {
          throw new Error(`Navigateur non compatible: ${compatibility.issues.join(', ')}`);
        }

        // Tester les permissions média
        console.log('🎥 [AUDIT] Testing media permissions...');
        const permissions = await jitsiService.testMediaPermissions();
        console.log('🎥 [AUDIT] Media permissions result:', permissions);
        if (!permissions.camera && !permissions.microphone) {
          console.warn('⚠️ [AUDIT] Permissions caméra/microphone non accordées:', permissions.error);
        }

        // Initialiser l'API Jitsi avec logging supplémentaire
        console.log('🚀 [AUDIT] Calling initializeJitsiAPI with config:', {
          containerId: 'jitsi-container',
          roomName: room.config.roomName,
          displayName: user.name,
          email: user.email,
          enableE2EE: room.config.enableE2EE
        });
        
        const api = await jitsiService.initializeJitsiAPI('jitsi-container', {
          ...room.config,
          displayName: user.name,
          email: user.email
        });
        
        console.log('✅ [AUDIT] initializeJitsiAPI completed successfully:', !!api);

        // Configurer les événements spécifiques
        api.addEventListener('videoConferenceJoined', () => {
          setIsLoading(false);
          setMeetingStats(prev => ({ ...prev, participants: prev.participants + 1 }));
          
          // 📡 Webhook session_started vers n8n
          jitsiService.triggerWebhook('session_started', {
            roomName: room.name,
            roomId: room.id,
            organizer: {
              id: user?.id || 'unknown',
              name: user?.name || 'Utilisateur',
              email: user?.email || 'unknown@example.com'
            },
            sessionMetadata: {
              sessionTitle: room.name,
              sessionType: sessionType,
              startTime: new Date().toISOString(),
              documentIds: sessionDocumentIds,
              roomConfig: room.config,
              expectedParticipants: participants.length,
              jitsiUrl: room.url
            },
            roomCapabilities: {
              recording: room.config.enableRecording,
              chat: room.config.enableChat,
              screenSharing: room.config.enableScreenSharing,
              whiteboard: room.config.enableWhiteboard,
              e2ee: room.config.enableE2EE
            }
          }).then(response => {
            if (response.success) {
              console.log('✅ [WEBHOOK] session_started envoyé vers n8n pour room:', room.name);
            }
          }).catch(error => {
            console.error('❌ [WEBHOOK] Erreur session_started:', error);
          });
          
          // Synchroniser les métadonnées de session (méthode existante)
          jitsiService.syncSessionMetadata(room.name, {
            documentIds: sessionDocumentIds,
            sessionTitle: room.name,
            sessionType: sessionType,
            participants: participants,
            startTime: new Date()
          });
        });

        api.addEventListener('participantJoined', (event: any) => {
          setMeetingStats(prev => ({ ...prev, participants: prev.participants + 1 }));
          
          // Ajouter le participant à la liste locale
          const newParticipant = {
            id: event.id || `participant-${Date.now()}`,
            name: event.displayName || 'Participant',
            joinedAt: new Date()
          };
          
          setParticipants(prev => {
            if (!prev.find(p => p.id === newParticipant.id)) {
              return [...prev, newParticipant];
            }
            return prev;
          });

          // 📡 Webhook détaillé vers n8n pour nouveau participant
          jitsiService.triggerWebhook('participant_joined', {
            roomName: room.name,
            roomId: room.id,
            participant: {
              ...newParticipant,
              email: event.email || 'unknown@example.com',
              device: {
                browser: navigator.userAgent,
                platform: navigator.platform,
                hasCamera: event.hasVideo !== false,
                hasMicrophone: event.hasAudio !== false
              }
            },
            sessionMetadata: {
              totalParticipants: participants.length + 1,
              sessionType: sessionType,
              isRecording: recordingStatus.isRecording,
              roomConfig: room.config,
              timestamp: new Date().toISOString()
            }
          }).then(response => {
            if (response.success) {
              console.log('✅ [WEBHOOK] participant_joined envoyé vers n8n:', newParticipant.name);
            }
          }).catch(error => {
            console.error('❌ [WEBHOOK] Erreur participant_joined:', error);
          });

          // Si enregistrement requis et en cours, demander consentement
          if (recordingStatus.isRecording && recordingConfig.requireConsent) {
            // Simuler demande de consentement pour nouveau participant
            console.log('🔔 Nouveau participant - consentement requis:', newParticipant.name);
          }
        });

        api.addEventListener('participantLeft', (event: any) => {
          setMeetingStats(prev => ({ ...prev, participants: Math.max(0, prev.participants - 1) }));
          
          // Retirer le participant de la liste locale
          setParticipants(prev => prev.filter(p => p.id !== event.id));

          // 📡 Webhook détaillé vers n8n pour départ participant
          const leftParticipant = participants.find(p => p.id === event.id);
          jitsiService.triggerWebhook('participant_left', {
            roomName: room.name,
            roomId: room.id,
            participant: {
              id: event.id,
              name: leftParticipant?.name || 'Participant inconnu',
              email: leftParticipant?.email || 'unknown@example.com',
              joinedAt: leftParticipant?.joinedAt,
              leftAt: new Date().toISOString(),
              sessionDuration: leftParticipant?.joinedAt 
                ? Math.floor((Date.now() - new Date(leftParticipant.joinedAt).getTime()) / 1000)
                : 0
            },
            sessionMetadata: {
              totalParticipants: Math.max(0, participants.length - 1),
              sessionType: sessionType,
              isRecording: recordingStatus.isRecording,
              roomConfig: room.config,
              timestamp: new Date().toISOString()
            }
          }).then(response => {
            if (response.success) {
              console.log('✅ [WEBHOOK] participant_left envoyé vers n8n:', event.id);
            }
          }).catch(error => {
            console.error('❌ [WEBHOOK] Erreur participant_left:', error);
          });
        });

        // 🎬 NOUVEAUX ÉVÉNEMENTS D'ENREGISTREMENT
        api.addEventListener('recordingStatusChanged', (event: any) => {
          console.log('🎬 Statut enregistrement changé:', event);
          
          setMeetingStats(prev => ({ ...prev, isRecording: event.on }));
          
          if (event.on) {
            // Enregistrement démarré par Jitsi
            setRecordingStatus(prev => ({
              ...prev,
              isRecording: true,
              status: 'recording'
            }));
          } else {
            // Enregistrement arrêté par Jitsi
            setRecordingStatus(prev => ({
              ...prev,
              isRecording: false,
              status: 'processing'
            }));
          }
        });

        api.addEventListener('recordingLinkAvailable', (event: any) => {
          console.log('🔗 Lien d\'enregistrement disponible:', event);
          
          setRecordingStatus(prev => ({
            ...prev,
            recordingUrl: event.link,
            status: 'completed'
          }));

          // Déclencher le traitement via n8n
          jitsiService.triggerWebhook('recording_available', {
            roomName: room.name,
            recordingUrl: event.link,
            recordingId: currentRecordingId
          });
        });

        api.addEventListener('errorOccurred', (event: any) => {
          console.error('❌ Erreur Jitsi:', event);
          setError(`Erreur de connexion: ${event.error?.message || 'Erreur inconnue'}`);
          
          // Si erreur pendant enregistrement
          if (recordingStatus.isRecording) {
            setRecordingStatus(prev => ({
              ...prev,
              status: 'error',
              error: event.error?.message || 'Erreur pendant l\'enregistrement'
            }));
          }
        });

        // Événement de sortie de conférence
        api.addEventListener('videoConferenceLeft', () => {
          console.log('👋 Conférence quittée automatiquement');
          
          // 📡 Webhook session_ended vers n8n pour sortie automatique
          const sessionDuration = startTime 
            ? Math.floor((Date.now() - startTime.getTime()) / 1000)
            : 0;

          jitsiService.triggerWebhook('session_ended', {
            roomName: room.name,
            roomId: room.id,
            organizer: {
              id: user?.id || 'unknown',
              name: user?.name || 'Utilisateur', 
              email: user?.email || 'unknown@example.com'
            },
            sessionSummary: {
              startTime: startTime?.toISOString() || new Date().toISOString(),
              endTime: new Date().toISOString(),
              duration: sessionDuration,
              totalParticipants: participants.length,
              participantsList: participants.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
                joinedAt: p.joinedAt
              })),
              wasRecorded: recordingStatus.isRecording || !!currentRecordingId,
              recordingId: currentRecordingId,
              sessionType: sessionType,
              documentIds: sessionDocumentIds
            },
            endReason: 'conference_ended'
          }).then(response => {
            if (response.success) {
              console.log('✅ [WEBHOOK] session_ended envoyé vers n8n (auto):', room.name);
            }
          }).catch(error => {
            console.error('❌ [WEBHOOK] Erreur session_ended (auto):', error);
          });
        });

        console.log('Réunion Jitsi initialisée avec succès');

      } catch (err) {
        console.error('❌ [AUDIT] ERREUR lors de l\'initialisation de Jitsi:', {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined,
          roomName: room?.name,
          roomConfig: room?.config,
          userName: user?.name,
          timestamp: new Date().toISOString()
        });
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
    // 📡 Webhook session_ended vers n8n AVANT de quitter
    const sessionDuration = startTime 
      ? Math.floor((Date.now() - startTime.getTime()) / 1000)
      : 0;

    jitsiService.triggerWebhook('session_ended', {
      roomName: room.name,
      roomId: room.id,
      organizer: {
        id: user?.id || 'unknown',
        name: user?.name || 'Utilisateur', 
        email: user?.email || 'unknown@example.com'
      },
      sessionSummary: {
        startTime: startTime?.toISOString() || new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: sessionDuration,
        totalParticipants: participants.length,
        participantsList: participants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          joinedAt: p.joinedAt,
          sessionDuration: p.joinedAt 
            ? Math.floor((Date.now() - new Date(p.joinedAt).getTime()) / 1000)
            : 0
        })),
        wasRecorded: recordingStatus.isRecording || !!currentRecordingId,
        recordingId: currentRecordingId,
        sessionType: sessionType,
        documentIds: sessionDocumentIds
      },
      endReason: 'user_initiated'
    }).then(response => {
      if (response.success) {
        console.log('✅ [WEBHOOK] session_ended envoyé vers n8n pour room:', room.name);
      }
    }).catch(error => {
      console.error('❌ [WEBHOOK] Erreur session_ended:', error);
    });

    // Nettoyer et quitter
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
          {/* Bouton rapports */}
          <button
            onClick={() => setShowReportsModal(true)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }
            `}
            title="Voir les rapports"
          >
            <FileText className="w-4 h-4" />
            <span>Rapports</span>
            {generatedReports.length > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {generatedReports.length}
              </span>
            )}
          </button>

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

      {/* 🎬 CONTRÔLES D'ENREGISTREMENT */}
      <div className="px-6 py-4">
        <RecordingControls
          isRecording={recordingStatus.isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          recordingStatus={recordingStatus}
          canStartRecording={canStartRecording}
          isLoading={recordingStatus.status === 'starting' || recordingStatus.status === 'stopping'}
          darkMode={darkMode}
          onShowConsentDialog={() => setShowConsentDialog(true)}
        />
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

      {/* 🔐 MODAL DE CONSENTEMENT RGPD */}
      <ConsentDialog
        isOpen={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onAccept={() => handleConsentResponse(true)}
        onDecline={() => handleConsentResponse(false)}
        participantName={user?.name || 'Utilisateur'}
        sessionTitle={room.name}
        organizerName={room.createdBy}
        recordingConfig={recordingConfig}
        isLoading={recordingStatus.status === 'starting'}
        darkMode={darkMode}
      />

      {/* 📄 MODAL RAPPORTS GÉNÉRÉS */}
      {showReportsModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowReportsModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden
          `}>
            <div className={`
              ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}
              border-b p-6 flex items-center justify-between
            `}>
              <div className="flex items-center space-x-3">
                <FileText className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                <div>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Rapports générés
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Session: {room.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${darkMode 
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }
                `}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <ReportsList
                reports={generatedReports}
                isLoading={false}
                onRefresh={handleRefreshReports}
                onDownload={handleDownloadReport}
                darkMode={darkMode}
                showActions={true}
              />
            </div>

            {/* Footer avec informations */}
            <div className={`
              ${darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}
              border-t p-4
            `}>
              <div className="flex items-center justify-between text-sm">
                <div className={`flex items-center space-x-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{participants.length} participants</span>
                  </div>
                  {recordingStatus.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(recordingStatus.duration / 60)}m {recordingStatus.duration % 60}s</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Shield className="w-4 h-4" />
                    <span>Traitement sécurisé</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowReportsModal(false)}
                  className={`
                    px-4 py-2 rounded-lg border font-medium transition-colors
                    ${darkMode 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}