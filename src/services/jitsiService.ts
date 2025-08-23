interface JitsiMeetingConfig {
  roomName: string;
  displayName: string;
  email?: string;
  password?: string;
  subject?: string;
  enableE2EE?: boolean;
  enableLobby?: boolean;
  enableRecording?: boolean;
  enableChat?: boolean;
  enableScreenSharing?: boolean;
  enableWhiteboard?: boolean;
}

interface JitsiMeetingRoom {
  id: string;
  name: string;
  url: string;
  password?: string;
  createdAt: Date;
  createdBy: string;
  participants: string[];
  isActive: boolean;
  config: JitsiMeetingConfig;
}

class JitsiService {
  private baseUrl = 'https://meet.jit.si';
  private domain = 'meet.jit.si';
  private api: any = null;

  // Générer un nom de salle unique et sécurisé
  generateRoomName(prefix: string = 'centrinote'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  }

  // Créer une nouvelle salle de réunion
  createMeetingRoom(config: Partial<JitsiMeetingConfig> & { displayName: string }): JitsiMeetingRoom {
    const roomName = this.generateRoomName();
    const fullConfig: JitsiMeetingConfig = {
      roomName,
      displayName: config.displayName,
      email: config.email,
      password: config.password,
      subject: config.subject || 'Session Centrinote',
      enableE2EE: config.enableE2EE ?? true,
      enableLobby: config.enableLobby ?? false,
      enableRecording: config.enableRecording ?? true,
      enableChat: config.enableChat ?? true,
      enableScreenSharing: config.enableScreenSharing ?? true,
      enableWhiteboard: config.enableWhiteboard ?? true
    };

    const room: JitsiMeetingRoom = {
      id: roomName,
      name: fullConfig.subject || roomName,
      url: `${this.baseUrl}/${roomName}`,
      password: fullConfig.password,
      createdAt: new Date(),
      createdBy: config.displayName,
      participants: [],
      isActive: false,
      config: fullConfig
    };

    return room;
  }

  // Initialiser l'API Jitsi Meet
  async initializeJitsiAPI(containerId: string, config: JitsiMeetingConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      // Vérifier si l'API Jitsi est disponible
      if (typeof window === 'undefined' || !(window as any).JitsiMeetExternalAPI) {
        reject(new Error('Jitsi Meet API not loaded. Please ensure the script is included.'));
        return;
      }

      const options = {
        roomName: config.roomName,
        width: '100%',
        height: '100%',
        parentNode: document.getElementById(containerId),
        configOverwrite: {
          // Configuration de sécurité
          enableE2EE: config.enableE2EE,
          e2eeLabels: {
            tooltip: 'Chiffrement de bout en bout activé',
            warning: 'Attention: Le chiffrement peut affecter les performances'
          },
          
          // Configuration des fonctionnalités
          enableLobbyChat: config.enableLobby,
          enableWelcomePage: false,
          enableClosePage: false,
          
          // Configuration de l'interface
          toolbarButtons: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'embedmeeting',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'invite',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
            'security'
          ].filter(button => {
            // Filtrer selon la configuration
            if (button === 'chat' && !config.enableChat) return false;
            if (button === 'desktop' && !config.enableScreenSharing) return false;
            if (button === 'recording' && !config.enableRecording) return false;
            if (button === 'etherpad' && !config.enableWhiteboard) return false;
            return true;
          }),

          // Configuration de sécurité avancée
          disableDeepLinking: true,
          disableThirdPartyRequests: true,
          
          // Configuration de performance
          resolution: 720,
          constraints: {
            video: {
              height: { ideal: 720, max: 1080, min: 240 }
            }
          },

          // Configuration du lobby
          enableLobby: config.enableLobby,
          
          // Configuration du chat
          disableChat: !config.enableChat,
          
          // Configuration de l'enregistrement
          enableRecording: config.enableRecording,
          recordingService: {
            enabled: config.enableRecording,
            sharingEnabled: config.enableRecording
          }
        },
        
        interfaceConfigOverwrite: {
          // Interface simplifiée et professionnelle
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          
          // Configuration des boutons
          TOOLBAR_ALWAYS_VISIBLE: false,
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
          
          // Configuration mobile
          MOBILE_APP_PROMO: false,
          
          // Configuration de l'affichage
          DEFAULT_BACKGROUND: '#1a1a1a',
          DISABLE_VIDEO_BACKGROUND: false,
          
          // Configuration de sécurité de l'interface
          HIDE_INVITE_MORE_HEADER: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
        }
      };

      try {
        this.api = new (window as any).JitsiMeetExternalAPI(this.domain, options);

        // Configuration des événements
        this.setupEventListeners();

        // Configuration utilisateur
        if (config.displayName) {
          this.api.executeCommand('displayName', config.displayName);
        }
        if (config.email) {
          this.api.executeCommand('email', config.email);
        }
        if (config.subject) {
          this.api.executeCommand('subject', config.subject);
        }

        // Activer le chiffrement E2EE si demandé
        if (config.enableE2EE) {
          this.api.executeCommand('toggleE2EE');
        }

        // Configuration du mot de passe si fourni
        if (config.password) {
          this.api.executeCommand('password', config.password);
        }

        resolve(this.api);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Configuration des écouteurs d'événements
  private setupEventListeners(): void {
    if (!this.api) return;

    // Événements de connexion
    this.api.addEventListener('videoConferenceJoined', (event: any) => {
      console.log('Rejoint la conférence:', event);
    });

    this.api.addEventListener('videoConferenceLeft', (event: any) => {
      console.log('Quitté la conférence:', event);
    });

    // Événements de participants
    this.api.addEventListener('participantJoined', (event: any) => {
      console.log('Participant rejoint:', event);
    });

    this.api.addEventListener('participantLeft', (event: any) => {
      console.log('Participant parti:', event);
    });

    // Événements de sécurité
    this.api.addEventListener('passwordRequired', () => {
      console.log('Mot de passe requis');
    });

    this.api.addEventListener('participantKickedOut', (event: any) => {
      console.log('Participant exclu:', event);
    });

    // Événements d'erreur
    this.api.addEventListener('errorOccurred', (event: any) => {
      console.error('Erreur Jitsi:', event);
    });

    // Événements de qualité
    this.api.addEventListener('audioMuteStatusChanged', (event: any) => {
      console.log('Statut audio changé:', event);
    });

    this.api.addEventListener('videoMuteStatusChanged', (event: any) => {
      console.log('Statut vidéo changé:', event);
    });
  }

  // Rejoindre une salle existante
  async joinMeeting(roomUrl: string, displayName: string, containerId: string): Promise<any> {
    const roomName = this.extractRoomNameFromUrl(roomUrl);
    const config: JitsiMeetingConfig = {
      roomName,
      displayName,
      enableE2EE: true,
      enableChat: true,
      enableScreenSharing: true,
      enableRecording: true,
      enableWhiteboard: true
    };

    return this.initializeJitsiAPI(containerId, config);
  }

  // Extraire le nom de la salle depuis l'URL
  private extractRoomNameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }

  // Quitter la réunion
  leaveMeeting(): void {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
  }

  // Contrôles de la réunion
  toggleAudio(): void {
    if (this.api) {
      this.api.executeCommand('toggleAudio');
    }
  }

  toggleVideo(): void {
    if (this.api) {
      this.api.executeCommand('toggleVideo');
    }
  }

  toggleScreenShare(): void {
    if (this.api) {
      this.api.executeCommand('toggleShareScreen');
    }
  }

  toggleChat(): void {
    if (this.api) {
      this.api.executeCommand('toggleChat');
    }
  }

  // Vérifier la compatibilité du navigateur
  checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    let compatible = true;

    // Vérifier WebRTC
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('WebRTC non supporté');
      compatible = false;
    }

    // Vérifier les API nécessaires
    if (!window.RTCPeerConnection) {
      issues.push('RTCPeerConnection non supporté');
      compatible = false;
    }

    // Vérifier HTTPS (requis pour les permissions caméra/micro)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('HTTPS requis pour les permissions caméra/microphone');
      compatible = false;
    }

    return { compatible, issues };
  }

  // Tester les permissions caméra/microphone
  async testMediaPermissions(): Promise<{ camera: boolean; microphone: boolean; error?: string }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      // Arrêter le stream de test
      stream.getTracks().forEach(track => track.stop());
      
      return {
        camera: videoTracks.length > 0,
        microphone: audioTracks.length > 0
      };
    } catch (error) {
      return {
        camera: false,
        microphone: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Obtenir les appareils disponibles
  async getAvailableDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Erreur lors de l\'énumération des appareils:', error);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  // Générer un lien de partage sécurisé
  generateShareableLink(room: JitsiMeetingRoom): string {
    let url = room.url;
    
    // Ajouter des paramètres de configuration
    const params = new URLSearchParams();
    
    if (room.config.enableE2EE) {
      params.append('config.enableE2EE', 'true');
    }
    
    if (room.config.subject) {
      params.append('config.subject', encodeURIComponent(room.config.subject));
    }
    
    if (params.toString()) {
      url += `#${params.toString()}`;
    }
    
    return url;
  }

  // Valider un nom de salle
  validateRoomName(roomName: string): { valid: boolean; error?: string } {
    if (!roomName || roomName.trim().length === 0) {
      return { valid: false, error: 'Le nom de la salle ne peut pas être vide' };
    }
    
    if (roomName.length > 100) {
      return { valid: false, error: 'Le nom de la salle est trop long (max 100 caractères)' };
    }
    
    // Caractères autorisés: lettres, chiffres, tirets, underscores
    const validPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!validPattern.test(roomName)) {
      return { valid: false, error: 'Le nom de la salle contient des caractères non autorisés' };
    }
    
    return { valid: true };
  }
}

// Instance singleton
export const jitsiService = new JitsiService();

// Export des types
export type { JitsiMeetingConfig, JitsiMeetingRoom };