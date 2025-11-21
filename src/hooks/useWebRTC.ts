import { useState, useRef, useCallback, useEffect } from 'react';

export interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  lastSeen: Date;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  participants: Participant[];
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isConnected: boolean;
  error: string | null;
  permissionStatus: 'pending' | 'granted' | 'denied' | 'not-requested';
  startVideo: () => Promise<void>;
  stopVideo: () => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: () => void;
  requestPermissions: () => Promise<boolean>;
}

export function useWebRTC(): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied' | 'not-requested'>('not-requested');
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const presenceInterval = useRef<NodeJS.Timeout | null>(null);

  // Détection du navigateur pour la compatibilité
  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(userAgent);
    const isOpera = /Opera|OPR/.test(userAgent);
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return { isChrome, isSafari, isFirefox, isOpera, isMobile };
  }, []);

  // Configuration adaptée selon le navigateur
  const getMediaConstraints = useCallback(() => {
    const { isSafari, isMobile } = getBrowserInfo();
    
    const baseConstraints = {
      video: {
        width: isMobile ? { ideal: 640, max: 1280 } : { ideal: 1280, max: 1920 },
        height: isMobile ? { ideal: 480, max: 720 } : { ideal: 720, max: 1080 },
        facingMode: 'user',
        frameRate: isMobile ? { ideal: 15, max: 30 } : { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: isSafari ? 48000 : 44100 // Safari préfère 48kHz
      }
    };

    // Ajustements spécifiques pour Safari
    if (isSafari) {
      return {
        ...baseConstraints,
        video: {
          ...baseConstraints.video,
          // Safari a parfois des problèmes avec certaines contraintes
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
    }

    return baseConstraints;
  }, [getBrowserInfo]);

  // Fonction pour demander les autorisations avec gestion d'erreurs améliorée
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setPermissionStatus('pending');
      
      console.log('Demande d\'autorisation pour caméra et microphone...');
      
      // Vérifier la disponibilité des API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Les API de média ne sont pas supportées par ce navigateur');
      }

      const constraints = getMediaConstraints();
      console.log('Contraintes utilisées:', constraints);

      // Demander l'autorisation
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtenu:', stream);
      console.log('Tracks vidéo:', stream.getVideoTracks());
      console.log('Tracks audio:', stream.getAudioTracks());

      // Vérifier que nous avons bien les tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        console.warn('Aucune track vidéo disponible');
      }
      if (audioTracks.length === 0) {
        console.warn('Aucune track audio disponible');
      }

      setLocalStream(stream);
      setIsVideoEnabled(videoTracks.length > 0 && videoTracks[0].enabled);
      setIsAudioEnabled(audioTracks.length > 0 && audioTracks[0].enabled);
      setPermissionStatus('granted');

      // Gérer les événements de fin de track
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log(`Track ${track.kind} terminée`);
          if (track.kind === 'video') {
            setIsVideoEnabled(false);
          } else if (track.kind === 'audio') {
            setIsAudioEnabled(false);
          }
        };
      });

      return true;

    } catch (err) {
      console.error('Erreur lors de la demande d\'autorisation:', err);
      setPermissionStatus('denied');
      
      if (err instanceof Error) {
        let errorMessage = '';
        
        switch (err.name) {
          case 'NotAllowedError':
            errorMessage = 'Accès à la caméra/microphone refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur et actualiser la page.';
            break;
          case 'NotFoundError':
            errorMessage = 'Aucune caméra ou microphone trouvé sur cet appareil. Vérifiez que vos périphériques sont connectés.';
            break;
          case 'NotReadableError':
            errorMessage = 'Impossible d\'accéder à la caméra/microphone. Ils sont peut-être utilisés par une autre application.';
            break;
          case 'OverconstrainedError':
            errorMessage = 'Les paramètres de caméra/microphone demandés ne sont pas supportés par votre appareil.';
            break;
          case 'SecurityError':
            errorMessage = 'Accès refusé pour des raisons de sécurité. Assurez-vous d\'utiliser HTTPS.';
            break;
          case 'AbortError':
            errorMessage = 'Demande d\'accès interrompue.';
            break;
          default:
            errorMessage = `Erreur lors de l'accès aux médias: ${err.message}`;
        }
        
        setError(errorMessage);
      } else {
        setError('Erreur inconnue lors de l\'accès aux médias');
      }
      
      return false;
    }
  }, [getMediaConstraints]);

  const startVideo = useCallback(async () => {
    console.log('startVideo appelé');
    if (permissionStatus === 'not-requested' || permissionStatus === 'denied') {
      return await requestPermissions();
    }
    
    if (localStream && !isVideoEnabled) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = true;
        setIsVideoEnabled(true);
        console.log('Vidéo activée');
      }
    }
  }, [permissionStatus, localStream, isVideoEnabled, requestPermissions]);

  const stopVideo = useCallback(() => {
    console.log('stopVideo appelé');
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Track ${track.kind} arrêtée`);
      });
      setLocalStream(null);
    }
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);
    setPermissionStatus('not-requested');
  }, [localStream]);

  const toggleVideo = useCallback(async () => {
    console.log('toggleVideo - État actuel:', { 
      isVideoEnabled, 
      permissionStatus, 
      hasStream: !!localStream,
      videoTracks: localStream?.getVideoTracks().length || 0
    });
    
    if (permissionStatus === 'not-requested' || permissionStatus === 'denied') {
      console.log('Demande d\'autorisation nécessaire');
      const granted = await requestPermissions();
      if (!granted) return;
    }
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setIsVideoEnabled(newState);
        console.log('Vidéo togglée:', newState);
        
        // Forcer la mise à jour de l'affichage
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      } else {
        console.warn('Aucune track vidéo trouvée');
      }
    } else {
      console.log('Pas de stream local, demande d\'autorisation');
      await requestPermissions();
    }
  }, [localStream, permissionStatus, requestPermissions]);

  const toggleAudio = useCallback(async () => {
    console.log('toggleAudio - État actuel:', { 
      isAudioEnabled, 
      permissionStatus, 
      hasStream: !!localStream,
      audioTracks: localStream?.getAudioTracks().length || 0
    });
    
    if (permissionStatus === 'not-requested' || permissionStatus === 'denied') {
      console.log('Demande d\'autorisation nécessaire');
      const granted = await requestPermissions();
      if (!granted) return;
    }
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setIsAudioEnabled(newState);
        console.log('Audio togglé:', newState);
      } else {
        console.warn('Aucune track audio trouvée');
      }
    } else {
      console.log('Pas de stream local, demande d\'autorisation');
      await requestPermissions();
    }
  }, [localStream, permissionStatus, requestPermissions]);

  // Gestion de la présence avec stabilisation
  const updateParticipantPresence = useCallback((participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, lastSeen: new Date(), connectionState: 'connected' }
        : p
    ));
  }, []);

  const handleParticipantDisconnect = useCallback((participantId: string) => {
    console.log(`Participant ${participantId} déconnecté`);
    
    // Marquer comme en reconnexion au lieu de supprimer immédiatement
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, connectionState: 'reconnecting' }
        : p
    ));

    // Attendre 10 secondes avant de supprimer définitivement
    const timeout = setTimeout(() => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      reconnectTimeouts.current.delete(participantId);
    }, 10000);

    reconnectTimeouts.current.set(participantId, timeout);
  }, []);

  const handleParticipantReconnect = useCallback((participantId: string) => {
    console.log(`Participant ${participantId} reconnecté`);
    
    // Annuler le timeout de suppression
    const timeout = reconnectTimeouts.current.get(participantId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeouts.current.delete(participantId);
    }

    // Remettre en ligne
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, connectionState: 'connected', lastSeen: new Date() }
        : p
    ));
  }, []);

  const createPeerConnection = useCallback((participantId: string) => {
    const { isChrome, isSafari } = getBrowserInfo();
    
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      // Configuration spécifique selon le navigateur
      iceCandidatePoolSize: isSafari ? 0 : 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Ajouter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Gérer les streams entrants
    peerConnection.ontrack = (event) => {
      console.log('Stream reçu pour participant:', participantId);
      const [remoteStream] = event.streams;
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream, connectionState: 'connected' }
          : p
      ));
    };

    // Gérer les candidats ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate pour:', participantId, event.candidate);
        // Envoyer le candidat ICE au participant distant
      }
    };

    // Gérer les changements d'état de connexion
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state pour ${participantId}:`, peerConnection.connectionState);
      
      switch (peerConnection.connectionState) {
        case 'connected':
          updateParticipantPresence(participantId);
          break;
        case 'disconnected':
          handleParticipantDisconnect(participantId);
          break;
        case 'failed':
          handleParticipantDisconnect(participantId);
          break;
        case 'connecting':
          setParticipants(prev => prev.map(p => 
            p.id === participantId 
              ? { ...p, connectionState: 'connecting' }
              : p
          ));
          break;
      }
    };

    // Gérer la reconnexion ICE
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state pour ${participantId}:`, peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'disconnected') {
        // Tenter une reconnexion ICE
        setTimeout(() => {
          if (peerConnection.iceConnectionState === 'disconnected') {
            peerConnection.restartIce();
          }
        }, 2000);
      }
    };

    peerConnections.current.set(participantId, peerConnection);
    return peerConnection;
  }, [localStream, getBrowserInfo, updateParticipantPresence, handleParticipantDisconnect]);

  const joinSession = useCallback(async (sessionId: string) => {
    try {
      setError(null);
      console.log('Rejoindre la session:', sessionId);
      
      setIsConnected(true);
      
      // Simuler l'ajout de participants avec gestion de présence stable
      setTimeout(() => {
        const mockParticipants: Participant[] = [
          {
            id: 'participant-1',
            name: 'Alice Smith',
            isVideoEnabled: true,
            isAudioEnabled: true,
            lastSeen: new Date(),
            connectionState: 'connected'
          },
          {
            id: 'participant-2', 
            name: 'Bob Johnson',
            isVideoEnabled: false,
            isAudioEnabled: true,
            lastSeen: new Date(),
            connectionState: 'connected'
          }
        ];
        
        setParticipants(mockParticipants);
        
        // Simuler des mises à jour de présence périodiques
        presenceInterval.current = setInterval(() => {
          setParticipants(prev => prev.map(p => ({
            ...p,
            lastSeen: new Date()
          })));
        }, 30000); // Mise à jour toutes les 30 secondes
        
      }, 1500);

    } catch (err) {
      console.error('Erreur lors de la connexion à la session:', err);
      setError('Impossible de rejoindre la session');
    }
  }, []);

  const leaveSession = useCallback(() => {
    console.log('Quitter la session');
    
    // Nettoyer l'interval de présence
    if (presenceInterval.current) {
      clearInterval(presenceInterval.current);
      presenceInterval.current = null;
    }
    
    // Nettoyer les timeouts de reconnexion
    reconnectTimeouts.current.forEach(timeout => clearTimeout(timeout));
    reconnectTimeouts.current.clear();
    
    // Fermer toutes les connexions peer
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    setParticipants([]);
    setIsConnected(false);
    stopVideo();
  }, [stopVideo]);

  // Vérifier les autorisations au chargement
  useEffect(() => {
    const checkPermissions = async () => {
      if (navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
            setPermissionStatus('granted');
          } else if (cameraPermission.state === 'denied' || microphonePermission.state === 'denied') {
            setPermissionStatus('denied');
          }
        } catch (err) {
          console.log('Impossible de vérifier les autorisations:', err);
        }
      }
    };

    checkPermissions();
  }, []);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      leaveSession();
    };
  }, [leaveSession]);

  return {
    localStream,
    participants,
    isVideoEnabled,
    isAudioEnabled,
    isConnected,
    error,
    permissionStatus,
    startVideo,
    stopVideo,
    toggleVideo,
    toggleAudio,
    joinSession,
    leaveSession,
    requestPermissions
  };
}