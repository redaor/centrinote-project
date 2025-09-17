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

interface JitsiRoom {
  id: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

class JitsiService {
  private baseUrl = 'https://meet.jit.si';
  private domain = 'meet.jit.si';
  private api: any = null;
  private currentRoom: JitsiRoom | null = null;
  private webhookCache = new Map<string, number>();
  private readonly WEBHOOK_DEBOUNCE_MS = 2000;
  private emailOnlyEvents = new Set(['recording_started', 'recording_stopped']);

  getCurrentRoom(): JitsiRoom | null {
    return this.currentRoom;
  }

  generateRoomName(prefix: string = 'centrinote'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}-${timestamp}-${random}`;
  }

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
    }).catch(() => {});

    return room;
  }

  async joinExistingRoom(
    roomId: string,
    userName: string,
    userEmail: string
  ): Promise<JitsiMeetingRoom | null> {
    try {
      // Vérifier si on est déjà dans cette salle
      if (this.currentRoom && this.currentRoom.id === roomId) {
        console.log('🔄 [Jitsi] Déjà dans la salle:', roomId);
        // Convertir JitsiRoom vers JitsiMeetingRoom pour la compatibilité
        return {
          id: this.currentRoom.id,
          name: this.currentRoom.name,
          url: `${this.baseUrl}/${roomId}`,
          createdAt: new Date(this.currentRoom.createdAt),
          createdBy: this.currentRoom.createdBy,
          participants: this.currentRoom.participants,
          isActive: this.currentRoom.status === 'active',
          config: {
            roomName: roomId,
            displayName: userName,
            email: userEmail,
            subject: `Réunion ${roomId}`,
            enableE2EE: false,
            enableLobby: false,
            enableRecording: true,
            enableChat: true,
            enableScreenSharing: true,
            enableWhiteboard: true
          }
        };
      }
      
      // Quitter la salle actuelle si différente
      if (this.currentRoom && this.currentRoom.id !== roomId) {
        await this.leaveRoom();
      }
      
      // Créer l'objet room interne
      const room: JitsiRoom = {
        id: roomId,
        name: `Réunion ${roomId}`,
        participants: [userEmail],
        createdBy: userEmail,
        createdAt: new Date().toISOString(),
        status: 'active'
      };
      
      this.currentRoom = room;
      
      // Créer l'objet JitsiMeetingRoom pour l'interface
      const meetingRoom: JitsiMeetingRoom = {
        id: roomId,
        name: `Réunion ${roomId}`,
        url: `${this.baseUrl}/${roomId}`,
        createdAt: new Date(),
        createdBy: userName,
        participants: [userEmail],
        isActive: true,
        config: {
          roomName: roomId,
          displayName: userName,
          email: userEmail,
          subject: `Réunion ${roomId}`,
          enableE2EE: false,
          enableLobby: false,
          enableRecording: true,
          enableChat: true,
          enableScreenSharing: true,
          enableWhiteboard: true
        }
      };
      
      // Déclencher le webhook
      await this.triggerSimpleWebhook('room_joined', {
        roomId,
        userName,
        userEmail,
        joinedAt: new Date().toISOString()
      });
      
      return meetingRoom;
    } catch (error) {
      console.error('❌ [Jitsi] Erreur joinExistingRoom:', error);
      throw error;
    }
  }

  async leaveRoom(): Promise<void> {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
    
    if (this.currentRoom) {
      await this.triggerSimpleWebhook('room_left', {
        roomId: this.currentRoom.id,
        leftAt: new Date().toISOString()
      });
      
      this.currentRoom = null;
    }
    
    sessionStorage.removeItem('activeJitsiRoom');
  }

  async initializeJitsiAPI(containerId: string, config: JitsiMeetingConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        reject(new Error('Window ou document non disponible'));
        return;
      }
      const win = window as any;
      if (!win.JitsiMeetExternalAPI) {
        reject(new Error('Jitsi Meet API not loaded. Please ensure the script is included.'));
        return;
      }
      const containerElement = document.getElementById(containerId);
      if (!containerElement) {
        reject(new Error(`Container element not found: ${containerId}`));
        return;
      }

      const options = {
        roomName: config.roomName,
        width: '100%',
        height: '100%',
        parentNode: containerElement,
        configOverwrite: {
          enableE2EE: config.enableE2EE,
          e2eeLabels: {
            tooltip: 'Chiffrement de bout en bout activé',
            warning: 'Attention: Le chiffrement peut affecter les performances'
          },
          enableLobbyChat: config.enableLobby,
          enableWelcomePage: false,
          enableClosePage: false,
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
            if (button === 'chat' && !config.enableChat) return false;
            if (button === 'desktop' && !config.enableScreenSharing) return false;
            if (button === 'recording' && !config.enableRecording) return false;
            if (button === 'etherpad' && !config.enableWhiteboard) return false;
            return true;
          }),
          disableDeepLinking: true,
          disableThirdPartyRequests: true,
          resolution: 720,
          constraints: {
            video: {
              height: { ideal: 720, max: 1080, min: 240 }
            }
          },
          enableLobby: config.enableLobby,
          disableChat: !config.enableChat,
          enableRecording: config.enableRecording,
          recordingService: {
            enabled: config.enableRecording,
            sharingEnabled: config.enableRecording
          }
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          TOOLBAR_ALWAYS_VISIBLE: false,
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
          MOBILE_APP_PROMO: false,
          DEFAULT_BACKGROUND: '#1a1a1a',
          DISABLE_VIDEO_BACKGROUND: false,
          HIDE_INVITE_MORE_HEADER: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
        }
      };

      try {
        this.api = new win.JitsiMeetExternalAPI(this.domain, options);
        this.setupEventListeners();
        this.api.addEventListener('videoConferenceJoined', () => {
          if (config.displayName) this.api.executeCommand('displayName', config.displayName);
          if (config.email) this.api.executeCommand('email', config.email);
          if (config.subject) this.api.executeCommand('subject', config.subject);
          if (config.enableE2EE) this.api.executeCommand('toggleE2EE');
          if (config.password) this.api.executeCommand('password', config.password);
        });
        resolve(this.api);
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.api) return;
    this.api.addEventListener('videoConferenceJoined', (event: any) => {
      console.log('Rejoint la conférence:', event);
    });
    this.api.addEventListener('videoConferenceLeft', (event: any) => {
      console.log('Quitté la conférence:', event);
    });
    this.api.addEventListener('participantJoined', (event: any) => {
      console.log('Participant rejoint:', event);
    });
    this.api.addEventListener('participantLeft', (event: any) => {
      console.log('Participant parti:', event);
    });
    this.api.addEventListener('passwordRequired', () => {
      console.log('Mot de passe requis');
    });
    this.api.addEventListener('participantKickedOut', (event: any) => {
      console.log('Participant exclu:', event);
    });
    this.api.addEventListener('errorOccurred', (event: any) => {
      console.error('Erreur Jitsi:', event);
    });
    this.api.addEventListener('audioMuteStatusChanged', (event: any) => {
      console.log('Statut audio changé:', event);
    });
    this.api.addEventListener('videoMuteStatusChanged', (event: any) => {
      console.log('Statut vidéo changé:', event);
    });
  }

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

  private extractRoomNameFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }

  leaveMeeting(): void {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
  }

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
      this.api.executeCommand('toggleScreenSharing');
    }
  }

  toggleChat(): void {
    if (this.api) {
      this.api.executeCommand('toggleChat');
    }
  }

  checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    let compatible = true;
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      issues.push('Environnement navigateur requis');
      compatible = false;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      issues.push('WebRTC non supporté');
      compatible = false;
    }
    if (!window?.RTCPeerConnection) {
      issues.push('RTCPeerConnection non supporté');
      compatible = false;
    }
    if (typeof location !== 'undefined' && location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push('HTTPS requis pour les permissions caméra/microphone');
      compatible = false;
    }
    return { compatible, issues };
  }

  async testMediaPermissions(): Promise<{ camera: boolean; microphone: boolean; error?: string }> {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) throw new Error('WebRTC non supporté');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
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

  async getAvailableDevices(): Promise<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[]; speakers: MediaDeviceInfo[] }> {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) throw new Error('enumerateDevices non supporté');
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

  generateShareableLink(room: JitsiMeetingRoom): string {
    let url = room.url;
    const params = new URLSearchParams();
    if (room.config.enableE2EE) {
      params.append('config.enableE2EE', 'true');
    }
    if (room.config.subject) {
      params.append('config.subject', room.config.subject);
    }
    if (params.toString()) {
      url += `#${params.toString()}`;
    }
    return url;
  }

  validateRoomName(roomName: string): { valid: boolean; error?: string } {
    if (!roomName || roomName.trim().length === 0) {
      return { valid: false, error: 'Le nom de la salle ne peut pas être vide' };
    }
    if (roomName.length > 100) {
      return { valid: false, error: 'Le nom de la salle est trop long (max 100 caractères)' };
    }
    const validPattern = /^[a-zA-Z0-9._-]+$/;
    if (!validPattern.test(roomName)) {
      return { valid: false, error: 'Le nom de la salle contient des caractères non autorisés' };
    }
    return { valid: true };
  }

  private shouldBlockWebhook(event: string, roomName: string): boolean {
    const cacheKey = `${event}_${roomName}`;
    const now = Date.now();
    const lastSent = this.webhookCache.get(cacheKey);
    if (lastSent && now - lastSent < this.WEBHOOK_DEBOUNCE_MS) {
      return true;
    }
    this.webhookCache.set(cacheKey, now);
    return false;
  }

  private async triggerSimpleWebhook(event: string, data: any): Promise<void> {
    const WEBHOOK_URL = import.meta.env.VITE_N8N_JITSI_WEBHOOK || 
                        'https://n8n.srv886297.hstgr.cloud/webhook/jitsi-recording';
    
    console.log(`📤 [Webhook] Sending ${event}:`, data);
    
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          ...data,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
      
      console.log(`✅ [Webhook] ${event} sent successfully`);
    } catch (error) {
      console.error(`❌ [Webhook] Failed to send ${event}:`, error);
    }
  }

  async triggerWebhook(
    event: string,
    data: any,
    options: { forceEmail?: boolean; skipDebounce?: boolean } = {}
  ): Promise<{ success: boolean; workflowId?: string; error?: string; blocked?: boolean }> {
    const roomName = data.roomName || data.room || 'unknown';
    if (!options.skipDebounce && this.shouldBlockWebhook(event, roomName)) {
      return { success: false, blocked: true, error: 'Webhook bloqué par système anti-spam' };
    }
    try {
      const { webhookRouter } = await import('./webhookRouter');
      const routerResult = await webhookRouter.routeEvent(event, data, options);
      if (routerResult.success) {
        const primaryResult = routerResult.results.find((r: any) => r.webhook === 'primary');
        return { success: true, workflowId: primaryResult?.workflowId };
      } else {
        return { success: false, error: routerResult.error };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

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
      if (!this.api) throw new Error('API Jitsi non initialisée');
      this.api.executeCommand('startRecording', {
        mode: 'stream',
        dropboxToken: undefined,
        shouldShare: true
      });
      const recordingId = `rec_${roomName}_${Date.now()}`;
      await this.triggerWebhook('recording_started', {
        roomName,
        recordingId,
        participants: options.participants,
        sessionType: options.sessionType,
        organizerId: options.organizerId,
        organizerName: options.organizerName,
        documentIds: options.documentIds || []
      }, { forceEmail: true });
      return { success: true, recordingId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  async stopRecording(
    roomName: string,
    recordingId: string,
    duration: number
  ): Promise<{ success: boolean; recordingUrl?: string; error?: string }> {
    try {
      if (!this.api) throw new Error('API Jitsi non initialisée');
      this.api.executeCommand('stopRecording', 'stream');
      const recordingUrl = `https://recordings.centrinote.com/${recordingId}.mp4`;
      await this.triggerWebhook('recording_stopped', {
        roomName,
        recordingId,
        recordingUrl,
        duration,
        status: 'completed'
      }, { forceEmail: true });
      return { success: true, recordingUrl };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

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
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        roomName
      };
      await this.triggerWebhook('consent_recorded', {
        roomName,
        consent: consentData
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  getRecordingStatus(): {
    isRecording: boolean;
    canRecord: boolean;
    recordingMode?: string;
  } {
    if (!this.api) {
      return { isRecording: false, canRecord: false };
    }
    return {
      isRecording: false,
      canRecord: true,
      recordingMode: 'stream'
    };
  }

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
        }      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }

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
      const response = await this.triggerWebhook('get_reports', {
        roomName,
        requestType: 'list_reports'
      });
      if (response.success) {
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
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
}

export const jitsiService = new JitsiService();
export type { JitsiMeetingConfig, JitsiMeetingRoom, JitsiRoom };