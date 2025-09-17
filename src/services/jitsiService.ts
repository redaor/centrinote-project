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
  
  // 🚫 Système anti-spam webhook
  private webhookCache = new Map<string, number>();
  private readonly WEBHOOK_DEBOUNCE_MS = 2000; // 2 secondes entre webhooks identiques
  private emailOnlyEvents = new Set(['recording_started', 'recording_stopped']); // Seuls ces événements déclenchent des emails

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

    // 📡 Webhook vers n8n pour synchroniser la création de room
    console.log('🚀 [DEBUG] ABOUT TO SEND room_created webhook with data:', {
      roomName: roomName,
      roomId: room.id,
      organizer: {
        name: config.displayName,
        email: config.email
      }
    });
    
    this.triggerWebhook('room_created', {
      roomName: roomName,
      roomId: room.id,
      organizer: {
        name: config.displayName,
        email: config.email
      },
      roomUrl: room.url,
      roomConfig: {
        enableE2EE: fullConfig.enableE2EE,
        enableRecording: fullConfig.enableRecording,
        enableChat: fullConfig.enableChat,
        enableScreenSharing: fullConfig.enableScreenSharing,
        enableWhiteboard: fullConfig.enableWhiteboard
      },
      metadata: {
        createdBy: config.displayName,
        createdAt: room.createdAt.toISOString(),
        source: 'centrinote_create_new',
        subject: fullConfig.subject,
        password: !!fullConfig.password
      }
    }).then(response => {
      if (response.success) {
        console.log('✅ [WEBHOOK] room_created envoyé avec succès vers n8n');
      } else {
        console.warn('⚠️ [WEBHOOK] Échec envoi room_created vers n8n:', response.error);
      }
    }).catch(error => {
      console.error('❌ [WEBHOOK] Erreur room_created:', error);
    });

    // Note: On retourne immédiatement, le webhook se déclenche en arrière-plan
    return room;
  }

  // Rejoindre une salle existante par nom (pour liens d'email)
  joinExistingRoom(roomName: string, displayName: string, email?: string): JitsiMeetingRoom {
    console.log('🔗 [AUDIT] joinExistingRoom appelé avec:', {
      originalRoomName: roomName,
      displayName,
      email
    });

    // Nettoyer le nom de salle (MOINS restrictif pour préserver les noms Jitsi valides)
    const cleanRoomName = roomName.trim();
    
    if (!cleanRoomName) {
      console.error('❌ [AUDIT] Nom de salle vide après nettoyage');
      throw new Error('Nom de salle invalide');
    }

    // Vérifier si le nom contient des caractères problématiques
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanRoomName)) {
      console.warn('⚠️ [AUDIT] Nom de salle contient des caractères non-standards:', cleanRoomName);
      // Ne pas rejeter, Jitsi peut gérer certains caractères
    }

    const fullConfig: JitsiMeetingConfig = {
      roomName: cleanRoomName,
      displayName,
      email,
      subject: `Réunion ${cleanRoomName}`,
      enableE2EE: false, // 🔧 Désactiver E2EE pour éviter les problèmes de connexion
      enableLobby: false,
      enableRecording: true,
      enableChat: true,
      enableScreenSharing: true,
      enableWhiteboard: true
    };

    const room: JitsiMeetingRoom = {
      id: cleanRoomName,
      name: `Réunion ${cleanRoomName}`,
      url: `${this.baseUrl}/${cleanRoomName}`,
      createdAt: new Date(),
      createdBy: displayName,
      participants: [],
      isActive: true, // Salle existante, donc active
      config: fullConfig
    };

    console.log('✅ [AUDIT] Room créée:', {
      id: room.id,
      roomName: room.config.roomName,
      url: room.url,
      enableE2EE: room.config.enableE2EE
    });

    // 📡 Webhook vers n8n pour synchroniser la room
    this.triggerWebhook('room_joined', {
      roomName: cleanRoomName,
      participant: {
        id: `user_${Date.now()}`,
        name: displayName,
        email: email,
        joinedAt: new Date().toISOString(),
        joinMethod: 'email_link'
      },
      roomUrl: room.url,
      roomConfig: {
        enableE2EE: room.config.enableE2EE,
        enableRecording: room.config.enableRecording,
        enableChat: room.config.enableChat
      },
      metadata: {
        createdBy: displayName,
        createdAt: room.createdAt.toISOString(),
        source: 'centrinote_join_existing'
      }
    }).then(response => {
      if (response.success) {
        console.log('✅ [WEBHOOK] room_joined envoyé avec succès vers n8n');
      } else {
        console.warn('⚠️ [WEBHOOK] Échec envoi room_joined vers n8n:', response.error);
      }
    }).catch(error => {
      console.error('❌ [WEBHOOK] Erreur room_joined:', error);
    });
    
    return room;
  }

  // Initialiser l'API Jitsi Meet
  async initializeJitsiAPI(containerId: string, config: JitsiMeetingConfig): Promise<any> {
    console.log('🚀 [AUDIT] initializeJitsiAPI appelé:', {
      containerId,
      roomName: config.roomName,
      displayName: config.displayName
    });

    return new Promise((resolve, reject) => {
      // Vérifier si l'API Jitsi est disponible
      if (typeof window === 'undefined') {
        console.error('❌ [AUDIT] Window undefined - environnement serveur?');
        reject(new Error('Window undefined'));
        return;
      }

      if (!(window as any).JitsiMeetExternalAPI) {
        console.error('❌ [AUDIT] JitsiMeetExternalAPI non disponible');
        console.log('🔍 [AUDIT] Scripts dans head:', Array.from(document.head.querySelectorAll('script')).map(s => s.src));
        reject(new Error('Jitsi Meet API not loaded. Please ensure the script is included.'));
        return;
      }

      // Vérifier le container DOM
      const containerElement = document.getElementById(containerId);
      console.log('🔍 [AUDIT] Container DOM:', {
        containerId,
        found: !!containerElement,
        element: containerElement,
        dimensions: containerElement ? {
          width: containerElement.offsetWidth,
          height: containerElement.offsetHeight,
          visible: containerElement.offsetParent !== null
        } : null
      });

      if (!containerElement) {
        console.error('❌ [AUDIT] Container DOM introuvable:', containerId);
        reject(new Error(`Container element not found: ${containerId}`));
        return;
      }

      const options = {
        roomName: config.roomName,
        width: '100%',
        height: '100%',
        parentNode: containerElement,
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

      console.log('🔧 [AUDIT] Configuration Jitsi finale:', {
        domain: this.domain,
        roomName: options.roomName,
        containerDimensions: {
          width: containerElement.offsetWidth,
          height: containerElement.offsetHeight
        },
        enableE2EE: config.enableE2EE
      });

      try {
        console.log('🚀 [AUDIT] Création JitsiMeetExternalAPI...');
        this.api = new (window as any).JitsiMeetExternalAPI(this.domain, options);
        console.log('✅ [AUDIT] JitsiMeetExternalAPI créé avec succès');

        // Configuration des événements
        console.log('🔧 [AUDIT] Configuration des événements...');
        this.setupEventListeners();

        // Attendre que Jitsi soit prêt avant de configurer
        this.api.addEventListener('videoConferenceJoined', () => {
          console.log('✅ [AUDIT] Conférence rejointe, configuration utilisateur...');
          
          // Configuration utilisateur
          if (config.displayName) {
            console.log('🔧 [AUDIT] Configuration displayName:', config.displayName);
            this.api.executeCommand('displayName', config.displayName);
          }
          if (config.email) {
            console.log('🔧 [AUDIT] Configuration email:', config.email);
            this.api.executeCommand('email', config.email);
          }
          if (config.subject) {
            console.log('🔧 [AUDIT] Configuration subject:', config.subject);
            this.api.executeCommand('subject', config.subject);
          }

          // Désactiver E2EE par défaut pour éviter les problèmes
          if (config.enableE2EE) {
            console.log('🔧 [AUDIT] Activation E2EE...');
            this.api.executeCommand('toggleE2EE');
          }

          // Configuration du mot de passe si fourni
          if (config.password) {
            console.log('🔧 [AUDIT] Configuration password');
            this.api.executeCommand('password', config.password);
          }
        });

        // Événement d'erreur
        this.api.addEventListener('readyToClose', () => {
          console.log('🔄 [AUDIT] Jitsi prêt à fermer');
        });

        console.log('✅ [AUDIT] API Jitsi complètement initialisée');
        resolve(this.api);
      } catch (error) {
        console.error('❌ [AUDIT] Erreur création JitsiMeetExternalAPI:', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          domain: this.domain,
          roomName: config.roomName,
          containerFound: !!containerElement
        });
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
  // ========================================
  // 🎬 NOUVELLES MÉTHODES D'ENREGISTREMENT
  // ========================================

  /**
   * 🎬 Démarrer l'enregistrement avec gestion consentement RGPD
   */
  async startRecording(
    roomName: string, 
    options: {
      participants: Array<{ id: string; name: string; email?: string; }>;
      documentIds?: string[];
      sessionType: string;
      organizerId: string;
      organizerName: string;
      requireConsent?: boolean;
    }
  ): Promise<{ success: boolean; recordingId?: string; error?: string }> {
    try {
      if (!this.api) {
        throw new Error('API Jitsi non initialisée');
      }

      console.log('🎬 Démarrage enregistrement pour salle:', roomName);

      // Démarrer l'enregistrement via l'API Jitsi
      this.api.executeCommand('startRecording', {
        mode: 'stream',
        dropboxToken: undefined,
        shouldShare: true,
        rtmpStreamKey: undefined,
        rtmpBroadcastID: undefined,
        youtubeStreamKey: undefined,
        youtubeBroadcastID: undefined
      });

      // Générer un ID d'enregistrement unique
      const recordingId = `rec_${roomName}_${Date.now()}`;

      // Déclencher le webhook n8n pour démarrage (AVEC EMAIL)
      await this.triggerWebhook('recording_started', {
        roomName,
        recordingId,
        participants: options.participants,
        sessionType: options.sessionType,
        organizerId: options.organizerId,
        organizerName: options.organizerName,
        documentIds: options.documentIds || []
      }, { forceEmail: true }); // 📧 Cet événement DOIT envoyer un email

      console.log('✅ Enregistrement démarré avec ID:', recordingId);
      return { success: true, recordingId };

    } catch (error) {
      console.error('❌ Erreur démarrage enregistrement:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ⏹️ Arrêter l'enregistrement et déclencher le traitement
   */
  async stopRecording(
    roomName: string,
    recordingId: string,
    duration: number
  ): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    try {
      if (!this.api) {
        throw new Error('API Jitsi non initialisée');
      }

      console.log('⏹️ Arrêt enregistrement pour salle:', roomName);

      // Arrêter l'enregistrement via l'API Jitsi
      this.api.executeCommand('stopRecording', 'stream');

      // Simuler URL de l'enregistrement (en production, viendrait de Jitsi)
      const recordingUrl = `https://recordings.centrinote.com/${recordingId}.mp4`;

      // Déclencher le webhook n8n pour traitement (AVEC EMAIL)
      await this.triggerWebhook('recording_stopped', {
        roomName,
        recordingId,
        recordingUrl,
        duration,
        status: 'completed'
      }, { forceEmail: true }); // 📧 Cet événement DOIT envoyer un email

      console.log('✅ Enregistrement arrêté, URL:', recordingUrl);
      return { success: true, recordingUrl };

    } catch (error) {
      console.error('❌ Erreur arrêt enregistrement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🚫 Vérifier si un webhook doit être bloqué (anti-spam)
   */
  private shouldBlockWebhook(event: string, roomName: string): boolean {
    const cacheKey = `${event}_${roomName}`;
    const now = Date.now();
    const lastSent = this.webhookCache.get(cacheKey);
    
    if (lastSent && now - lastSent < this.WEBHOOK_DEBOUNCE_MS) {
      console.log(`🚫 Webhook bloqué (debounce): ${event} pour ${roomName}`);
      return true;
    }
    
    // Mettre à jour le cache
    this.webhookCache.set(cacheKey, now);
    return false;
  }

  /**
   * 📡 Déclencher un webhook n8n avec routing intelligent
   */
  async triggerWebhook(
    event: string,
    data: any,
    options: { 
      forceEmail?: boolean; // Forcer l'envoi d'email même si pas dans emailOnlyEvents
      skipDebounce?: boolean; // Ignorer le debounce
    } = {}
  ): Promise<{ success: boolean; workflowId?: string; error?: string; blocked?: boolean }> {
    const roomName = data.roomName || data.room || 'unknown';
    
    // 🚫 Vérifier anti-spam (sauf si skipDebounce)
    if (!options.skipDebounce && this.shouldBlockWebhook(event, roomName)) {
      return { 
        success: false, 
        blocked: true, 
        error: 'Webhook bloqué par système anti-spam' 
      };
    }

    try {
      // 🎯 Utiliser le WebhookRouter pour routing intelligent
      const { webhookRouter } = await import('./webhookRouter');
      
      const routerResult = await webhookRouter.routeEvent(event, data, options);
      
      if (routerResult.success) {
        const primaryResult = routerResult.results.find(r => r.webhook === 'primary');
        console.log('✅ Webhook n8n envoyé avec succès:', event);
        
        return {
          success: true,
          workflowId: primaryResult?.workflowId
        };
      } else {
        console.error('❌ Tous les webhooks ont échoué:', routerResult.error);
        return {
          success: false,
          error: routerResult.error
        };
      }
    } catch (error) {
      console.error('❌ Erreur router webhook n8n:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * ✅ Enregistrer le consentement d'un participant
   */
  async recordConsent(
    roomName: string,
    participantId: string,
    participantName: string,
    hasConsented: boolean,
    consentMethod: 'explicit' | 'implicit' = 'explicit'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const consentData = {
        participantId,
        participantName,
        hasConsented,
        timestamp: new Date().toISOString(),
        consentMethod,
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        roomName
      };

      // Envoyer le consentement via webhook n8n
      await this.triggerWebhook('consent_recorded', {
        roomName,
        consent: consentData
      });

      console.log(`✅ Consentement enregistré pour ${participantName}:`, hasConsented);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur enregistrement consentement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 🌐 Obtenir l'IP client (pour le consentement RGPD)
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 📊 Obtenir le statut de l'enregistrement
   */
  getRecordingStatus(): {
    isRecording: boolean;
    canRecord: boolean;
    recordingMode?: string;
  } {
    if (!this.api) {
      return { isRecording: false, canRecord: false };
    }

    // En production, cette info viendrait de l'API Jitsi
    // Pour l'instant, simulation basique
    return {
      isRecording: false, // À implémenter selon les événements Jitsi
      canRecord: true,
      recordingMode: 'stream'
    };
  }

  /**
   * 🔄 Synchroniser les métadonnées de session
   */
  async syncSessionMetadata(
    roomName: string,
    metadata: {
      documentIds?: string[];
      sessionTitle?: string;
      sessionType: string;
      participants: Array<{ id: string; name: string; email?: string; }>;
      startTime: Date;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.triggerWebhook('session_metadata', {
        roomName,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          jitsiDomain: this.domain,
          e2eeEnabled: true
        }
      });

      console.log('✅ Métadonnées session synchronisées');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur sync métadonnées:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * 📄 Récupérer les rapports générés
   */
  async getGeneratedReports(roomName: string): Promise<{
    success: boolean;
    reports?: Array<{
      id: string;
      type: string;
      status: string;
      fileUrl?: string;
      generatedAt: Date;
    }>;
    error?: string;
  }> {
    try {
      // En production, ceci ferait appel à une API dédiée
      // Pour l'instant, simulation avec webhook n8n
      const response = await this.triggerWebhook('get_reports', {
        roomName,
        requestType: 'list_reports'
      });

      if (response.success) {
        // Simulation des rapports - en production, viendrait de n8n
        const mockReports = [
          {
            id: `report_${roomName}_transcript`,
            type: 'transcript',
            status: 'completed',
            fileUrl: `https://reports.centrinote.com/${roomName}_transcript.pdf`,
            generatedAt: new Date()
          },
          {
            id: `report_${roomName}_summary`,
            type: 'summary',
            status: 'generating',
            generatedAt: new Date()
          }
        ];

        return { success: true, reports: mockReports };
      }

      return { success: false, error: 'Erreur récupération rapports' };

    } catch (error) {
      console.error('❌ Erreur récupération rapports:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

// Instance singleton
export const jitsiService = new JitsiService();

// Export des types
export type { JitsiMeetingConfig, JitsiMeetingRoom };