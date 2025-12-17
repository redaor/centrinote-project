// 🎥 Hook pour gérer Daily.co iframe et événements (SINGLETON + IDEMPOTENT)
import { useState, useEffect, useRef, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyEvent, DailyParticipant } from '@daily-co/daily-js';
import { dailyClient } from '../lib/daily';
import { useAuth } from '../components/AuthProvider';
import { MeetingParticipant } from '../types/meetings';

// 🔧 SINGLETON PATTERN pour éviter les duplicatas
declare global {
  interface Window { 
    __dailyFrame?: DailyCall;
  }
}

export interface DailyState {
  callFrame: DailyCall | null;
  roomUrl: string | null;
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  participants: DailyParticipant[];
  localParticipant: DailyParticipant | null;
  isRecording: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  connectionState: 'new' | 'initializing' | 'initialized' | 'joining' | 'joined' | 'left' | 'error';
}

export interface UseDaily {
  // État
  state: DailyState;
  
  // Actions de base
  createAndJoin: (roomName?: string) => Promise<void>;
  joinRoom: (roomUrl: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  
  // Contrôles média
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  
  // Enregistrement
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  
  // Utilitaires
  sendChatMessage: (message: string) => void;
  kickParticipant: (participantId: string) => void;
  
  // Nettoyage
  destroy: () => void;
}

// 🔧 HELPERS POUR SINGLETON
const getSingleton = (): DailyCall | null => {
  return window.__dailyFrame ?? null;
};

const setSingleton = (frame: DailyCall | undefined): void => {
  window.__dailyFrame = frame;
};

function isJoinedOrJoining(frame: DailyCall | null): boolean {
  if (!frame) return false;
  try {
    const state = frame.meetingState();
    console.log('[DAILY] Meeting state:', state);
    return state === 'joining-meeting' || state === 'joined-meeting';
  } catch (e) {
    console.log('[DAILY] Error checking meeting state:', e);
    return false;
  }
}

// 🔧 HELPERS HOISTÉS (function declarations pour éviter TDZ)

// Helper pour attendre que le container soit monté
async function waitForContainer(containerRef: React.RefObject<HTMLDivElement>, maxAttempts = 50, delayMs = 50): Promise<boolean> {
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    if (containerRef?.current) {
      console.log(`✅ [DAILY] Container trouvé après ${attempts} tentatives (${attempts * delayMs}ms)`);
      return true;
    }
    if (attempts === 0) {
      console.log('⏳ [DAILY] En attente du container DOM...');
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  console.error(`⚠️ [DAILY] Container introuvable après attente (${maxAttempts * delayMs}ms)`);
  return false;
}

// Helper pour construire l'objet utilisateur actuel
function buildCurrentAppUser(user: any) {
  if (!user) return null;
  
  return {
    app_user_id: user.id,
    app_user_name: user.name || user.email.split('@')[0],
    app_user_email: user.email,
    role: 'organizer' // Par défaut organisateur, pourra être affiné plus tard
  };
}

// Helper pour envoyer le front probe avec enrichissement utilisateur (THROTTLED)
let lastProbeSent: { [key: string]: number } = {};
const PROBE_THROTTLE_MS = 5000; // Throttle à 5 secondes

async function sendFrontProbeThrottled(
  eventType: 'participant.joined' | 'meeting.started', 
  basePayload: any,
  currentUser: any,
  participantsRef: React.MutableRefObject<MeetingParticipant[]>,
  meetingRef: React.MutableRefObject<{ id: string; title?: string; room_name: string; room_url: string; created_by: string } | null>
) {
  // ⚠️ DÉSACTIVÉ : n8n n'est plus utilisé, système autonome avec Netlify Functions
  // Les événements sont maintenant gérés directement par Daily.co webhooks vers daily-webhook-recording
  return;
  
  // Code désactivé ci-dessous (conservé pour référence)
  /*
  // Throttle check
  const now = Date.now();
  const lastSent = lastProbeSent[eventType] || 0;
  if (now - lastSent < PROBE_THROTTLE_MS) {
    console.log(`[FRONT-PROBE] Throttled ${eventType} (sent ${now - lastSent}ms ago)`);
    return;
  }
  
  const ENABLE_FRONT_PROBE = false; // DÉSACTIVÉ
  if (!ENABLE_FRONT_PROBE) return;

  try {
    lastProbeSent[eventType] = now;
    
    // Récupérer les variables d'environnement
    const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv886297.hstgr.cloud';
    const meetingEventsPath = import.meta.env.VITE_N8N_MEETING_EVENTS || '/webhook/daily-meeting-events';
    
    // Vérifier que la base commence par http
    if (!webhookBase || !/^https?:\/\//.test(webhookBase)) {
      console.warn('[FRONT-PROBE] disabled: bad base URL:', webhookBase);
      return;
    }
    
    // Construire l'URL absolue correctement
    const probeUrl = new URL(meetingEventsPath, webhookBase).toString();
    
    // Construire l'objet me (utilisateur connecté)
    const currentAppUser = buildCurrentAppUser(currentUser);

    // Récupérer les valeurs actuelles des refs
    const mp = participantsRef.current;
    const m = meetingRef.current;
    
    // ⏳ Valider que les données sont prêtes
    if (!m || !Array.isArray(mp) || mp.length === 0) {
      console.log('⏳ [PROBE] Skip: meeting/participants pas prêts', { 
        hasMeeting: !!m, 
        mpLen: mp?.length,
        meetingTitle: m?.title 
      });
      return;
    }
    
    console.log('✅ [PROBE] Données prêtes:', {
      eventType,
      meetingId: m.id,
      meetingTitle: m.title,
      participantsCount: mp.length
    });

    // Construire organizer
    const organizer = currentUser ? {
      id: currentUser.id,
      name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Unknown',
      email: currentUser.email || 'unknown@example.com',
    } : null;

    // Filtrer les invités (exclure l'organizer)
    const invited = mp.filter(p => p.role !== 'organizer').map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role || 'guest'
    }));

    // Construire le payload selon le type d'événement
    let payload;
    
    if (eventType === 'participant.joined') {
      payload = {
        room: m.room_name,
        meeting_id: m.id,
        url: m.room_url,
        participant: {
          user_name: organizer?.name || basePayload.participant?.user_name || 'anonymous',
          email: organizer?.email || 'unknown@example.com',
          app_user_id: organizer?.id || 'unknown',
          role: 'organizer',
          session_id: basePayload.participant?.session_id || basePayload?.session_id || 'unknown'
        }
      };
    } else if (eventType === 'meeting.started') {
      payload = {
        room: m.room_name,
        meeting_id: m.id,
        url: m.room_url,
        participants: mp
      };
    }
    
    // Construire le body COMPLET avec toutes les données
    const body = {
      type: eventType,
      source: 'front-probe',
      payload,
      organizer,
      invited, // Liste des invités (sans l'organizer)
      meeting_title: m.title ?? null,
      timestamp: new Date().toISOString(),
    };
    
    // Log de l'endpoint et du body
    console.log('[FRONT-PROBE] endpoint:', probeUrl);
    console.log('[FRONT-PROBE] body =', JSON.stringify(body, null, 2));
    console.log('[FRONT-PROBE] invited details:', body.invited);
    console.log('[FRONT-PROBE] organizer details:', body.organizer);
    console.log('[FRONT-PROBE] meeting_title:', body.meeting_title);
    
    // Envoyer la requête
    const response = await fetch(probeUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      console.log('[FRONT-PROBE] OK - Response:', response.status);
    } else {
      console.log('[FRONT-PROBE] Failed - Status:', response.status);
    }
  } catch (error) {
    console.error('[FRONT-PROBE] fetch error (throttled):', error);
  }
  */
}

export function useDaily(
  containerRef?: React.RefObject<HTMLDivElement>,
  meetingParticipants?: MeetingParticipant[],
  meeting?: { id: string; title?: string; room_name: string; room_url: string; created_by: string } | null
): UseDaily {
  // 🔍 LOG DE DEBUG pour tracer les données reçues et le lifecycle (dev only)
  if (import.meta.env.DEV) {
    console.debug('🔍 [useDaily-MOUNT] Hook mounted/remounted', {
      meetingParticipants: meetingParticipants,
      participantsCount: meetingParticipants?.length || 0,
      meeting: meeting ? {
        id: meeting.id,
        title: meeting.title,
        room_name: meeting.room_name
      } : 'null',
      timestamp: new Date().toISOString()
    });
  }
  
  // Valeurs par défaut & garde-fous
  const validatedParticipants = Array.isArray(meetingParticipants) ? meetingParticipants : [];
  
  const { user } = useAuth();
  
  // 📌 Refs pour garder les données à jour dans les callbacks
  const participantsRef = useRef<MeetingParticipant[]>([]);
  useEffect(() => {
    participantsRef.current = Array.isArray(meetingParticipants) ? meetingParticipants : [];
    if (import.meta.env.DEV) {
      console.log('📌 [useDaily] participantsRef mis à jour:', participantsRef.current.length, 'participants');
    }
  }, [meetingParticipants]);

  const meetingRef = useRef<typeof meeting>(null);
  useEffect(() => { 
    meetingRef.current = meeting; 
    if (import.meta.env.DEV) {
      console.log('📌 [useDaily] meetingRef mis à jour:', meeting ? meeting.title : 'null');
    }
  }, [meeting]);
  
  const [state, setState] = useState<DailyState>({
    callFrame: null,
    roomUrl: null,
    isJoined: false,
    isLoading: false,
    error: null,
    participants: [],
    localParticipant: null,
    isRecording: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    connectionState: 'new'
  });

  // Refs pour éviter les doubles appels et protéger contre StrictMode
  const frameRef = useRef<DailyCall | null>(null);
  const joiningRef = useRef(false);
  const eventHandlersRef = useRef<{ event: string; handler: any }[]>([]);
  const initializingRef = useRef(false);
  const destroyedRef = useRef(false);
  const recordingIdRef = useRef<string | null>(null);
  
  // 🔧 SINGLETON FRAME MANAGEMENT - IDEMPOTENT ET STRICTMODE SAFE
  const ensureFrame = useCallback(() => {
    // Protection contre les appels multiples pendant l'initialisation
    if (initializingRef.current) {
      console.debug('[DAILY] ensureFrame: initialization in progress, skipping');
      return null;
    }
    
    // Protection contre l'utilisation après destruction
    if (destroyedRef.current) {
      console.debug('[DAILY] ensureFrame: hook was destroyed, skipping');
      return null;
    }
    
    // Si on a déjà une ref locale ET qu'elle est encore valide, on la retourne
    if (frameRef.current) {
      try {
        // Vérifier que la frame est encore valide
        frameRef.current.meetingState();
        console.debug('[DAILY] ensureFrame: using existing valid local ref');
        return frameRef.current;
      } catch (e) {
        // Frame invalide, la nettoyer
        console.debug('[DAILY] ensureFrame: local ref invalid, cleaning up');
        frameRef.current = null;
        setSingleton(undefined);
        recordingIdRef.current = null;
      }
    }
    
    // Utiliser la méthode officielle Daily pour obtenir l'instance existante
    try {
      const existingInstance = DailyIframe.getCallInstance?.();
      if (existingInstance) {
        console.debug('[DAILY] ensureFrame: found existing Daily instance');
        frameRef.current = existingInstance;
        setSingleton(existingInstance);
        updateState({ callFrame: existingInstance });
        return existingInstance;
      }
    } catch (e) {
      console.debug('[DAILY] ensureFrame: no existing instance found');
    }
    
    // Vérifier s'il existe un singleton global valide (fallback)
    const existingSingleton = getSingleton();
    if (existingSingleton) {
      try {
        // Vérifier que le singleton est encore valide
        existingSingleton.meetingState();
        console.debug('[DAILY] ensureFrame: found valid existing singleton');
        frameRef.current = existingSingleton;
        updateState({ callFrame: existingSingleton });
        return existingSingleton;
      } catch (e) {
        // Singleton invalide, le nettoyer
        console.debug('[DAILY] ensureFrame: singleton invalid, cleaning up');
        setSingleton(undefined);
      }
    }
    
    // Pas de frame existant valide, on doit en créer un nouveau
    if (!containerRef?.current) {
      console.debug('[DAILY] ensureFrame: container not ready, cannot create frame');
      return null;
    }
    
    console.debug('[DAILY] before create', { hasContainer: !!containerRef.current });
    console.debug('[DAILY] getCallInstance', !!DailyIframe.getCallInstance?.());
    console.debug('[DAILY] ensureFrame: creating new frame');
    initializingRef.current = true;
    
    try {
      const newFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          pointerEvents: 'auto' // S'assurer que les clics passent à travers
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        showLocalVideo: true,
        showParticipantsBar: true,
        activeSpeakerMode: true,
        lang: 'fr'
        // Note: showPrejoinUI n'est pas supporté dans createFrame, il sera géré via frame.join()
      });
      
      // Vérifier qu'on n'a pas été détruit pendant la création
      if (destroyedRef.current) {
        console.debug('[DAILY] ensureFrame: destroyed during creation, cleaning up new frame');
        newFrame.destroy();
        return null;
      }
      
      // Sauvegarder comme singleton
      setSingleton(newFrame);
      frameRef.current = newFrame;
      updateState({ callFrame: newFrame });
      
      // Setup event handlers
      setupEventHandlers(newFrame);
      
      console.debug('[DAILY] ensureFrame: new frame created and saved as singleton');
      return newFrame;
    } catch (error) {
      console.error('[DAILY] ensureFrame: error creating frame:', error);
      return null;
    } finally {
      initializingRef.current = false;
    }
  }, [containerRef, setupEventHandlers]);

  // Cleanup function - IDEMPOTENT ET SAFE
  useEffect(() => {
    return () => {
      console.debug('[DAILY] cleanup start', { hadFrame: !!frameRef.current });
      console.debug('[DAILY] will destroy frame?', !!frameRef.current);
      
      // Marquer comme détruit pour empêcher les nouvelles initialisations
      destroyedRef.current = true;
      
      // Marquer comme en cours de destruction pour éviter les race conditions
      const frameToDestroy = frameRef.current;
      frameRef.current = null;
      
      if (frameToDestroy) {
        try {
          // Remove all event handlers
          eventHandlersRef.current.forEach(({ event, handler }) => {
            try {
              frameToDestroy.off(event as DailyEvent, handler);
            } catch (e) {
              // Silently ignore handler removal errors
            }
          });
          eventHandlersRef.current = [];
          
          // Leave meeting if joined
          if (isJoinedOrJoining(frameToDestroy)) {
            frameToDestroy.leave();
          }
          
          // Destroy frame
          frameToDestroy.destroy();
        } catch (e) {
          console.debug('[DAILY] Cleanup: error during destruction:', e);
        } finally {
          setSingleton(undefined);
        }
      }
      
      // Reset guards
      joiningRef.current = false;
      initializingRef.current = false;
      
      console.debug('[DAILY] cleanup completed', { destroyed: !frameRef.current });
    };
  }, []);

  function updateState(updates: Partial<DailyState>) {
    setState(prev => ({ ...prev, ...updates }));
  }

  const setupEventHandlers = useCallback((callFrame: DailyCall) => {
    // Helper to register event handler and track it for cleanup
    const registerHandler = (event: DailyEvent, handler: any) => {
      callFrame.on(event, handler);
      eventHandlersRef.current.push({ event, handler });
    };
    
    // Connexion
    registerHandler('loading', () => {
      console.log('🔄 [DAILY] Chargement...');
      updateState({ isLoading: true, error: null });
    });

    registerHandler('loaded', () => {
      console.log('✅ [DAILY] Chargé');
      updateState({ isLoading: false, connectionState: 'initialized' });
    });

    registerHandler('joining-meeting', () => {
      console.log('🚪 [DAILY] Connexion en cours...');
      updateState({ connectionState: 'joining' });
    });

    registerHandler('joined-meeting', async (event: any) => {
      console.log('✅ [DAILY] Connecté à la réunion:', event);
      updateState({ 
        isJoined: true, 
        connectionState: 'joined',
        participants: Object.values(event?.participants || {}),
        localParticipant: event?.local
      });
      
      // 🧪 FRONT PROBE - Test direct app → n8n (participant.joined) THROTTLED
      try {
        const roomUrl = state.roomUrl || '';
        await sendFrontProbeThrottled('participant.joined', {
          room: roomUrl ? new URL(roomUrl).pathname.slice(1) : 'unknown',
          meeting_id: event?.participants?.local?.meeting_id || 'unknown',
          participant: { 
            user_name: event?.participants?.local?.user_name || 'anonymous',
            session_id: event?.participants?.local?.session_id || 'unknown'
          }
        }, user, participantsRef, meetingRef);
      } catch (e) {
        console.debug('[DAILY] Error sending front probe:', e);
      }
    });

    registerHandler('left-meeting', () => {
      console.log('👋 [DAILY] Quitté la réunion');
      updateState({ 
        isJoined: false, 
        connectionState: 'left',
        participants: [],
        localParticipant: null
      });
    });

    // Participants
    registerHandler('participant-joined', async (event: any) => {
      console.log('👋 [DAILY] Participant rejoint:', event?.participant);
      if (event?.participant) {
        setState(prev => {
          const newParticipants = [...prev.participants, event.participant];
          
          // Si c'est le 2ème participant qui rejoint (réunion qui démarre)
          if (newParticipants.length === 2) {
            console.log('🎬 [DAILY] Meeting started - 2 participants present');
            
            // Envoyer meeting.started avec la liste des participants du formulaire (THROTTLED)
            try {
              const currentRoomUrl = prev.roomUrl || '';
              sendFrontProbeThrottled('meeting.started', {
                room: currentRoomUrl ? new URL(currentRoomUrl).pathname.slice(1) : 'unknown',
                meeting_id: 'meeting-started'
              }, user, participantsRef, meetingRef).catch(error => {
                console.error('❌ [FRONT-PROBE] Erreur meeting.started:', error);
              });
            } catch (e) {
              console.debug('[DAILY] Error sending meeting.started probe:', e);
            }
          }
          
          return {
            ...prev,
            participants: newParticipants
          };
        });
      }
    });

    registerHandler('participant-left', (event: any) => {
      console.log('👋 [DAILY] Participant parti:', event?.participant);
      if (event?.participant) {
        setState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.session_id !== event.participant.session_id)
        }));
      }
    });

    registerHandler('participant-updated', (event: any) => {
      if (event?.participant) {
        setState(prev => ({
          ...prev,
          participants: prev.participants.map(p => 
            p.session_id === event.participant.session_id ? event.participant : p
          )
        }));
      }
    });

    // Enregistrement
    registerHandler('recording-started', async (event: any) => {
      console.log('🎬 [DAILY] Enregistrement démarré', event);
      console.log('🔍 [DAILY-STATE] AVANT updateState - isRecording:', frameRef.current ? 'frame exists' : 'no frame');
      updateState({ isRecording: true });
      console.log('🔍 [DAILY-STATE] APRÈS updateState({ isRecording: true })');

      if (event?.recording?.id) {
        recordingIdRef.current = event.recording.id;
        console.log('📹 [SUMMARY] Recording ID stocké depuis recording-started:', recordingIdRef.current);

        // NOUVEAU : Sauvegarder aussi le recording_id en base de données immédiatement
        const currentMeeting = meetingRef.current;
        if (currentMeeting?.id) {
          try {
            console.log('💾 [DAILY] Sauvegarde recording_id en base:', event.recording.id);
            const response = await fetch('/.netlify/functions/update-meeting-recording', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingId: currentMeeting.id,
                recordingId: event.recording.id
              })
            });

            if (response.ok) {
              console.log('✅ [DAILY] Recording ID sauvegardé en base');
            } else {
              console.warn('⚠️ [DAILY] Échec sauvegarde recording_id:', await response.text());
            }
          } catch (error) {
            console.error('❌ [DAILY] Erreur sauvegarde recording_id:', error);
          }
        }
      }
    });

    registerHandler('recording-stopped', async (event: any) => {
      console.log('⏹️ [DAILY] Enregistrement arrêté:', event);
      console.log('🔍 [DAILY-STATE] AVANT updateState - isRecording:', frameRef.current ? 'frame exists' : 'no frame');
      updateState({ isRecording: false });
      console.log('🔍 [DAILY-STATE] APRÈS updateState({ isRecording: false })');

      // ✅ WEBHOOK SYSTEM: Plus de polling ni d'appel generate-summary-auto ici
      // Le webhook Daily.co (daily-recording-ready) gérera automatiquement :
      // 1. Récupération du recording_url via Daily API
      // 2. Mise à jour de Supabase (recording_url, recording_ready_at)
      // 3. Appel de generate-summary-auto server-side

      console.log('✅ [WEBHOOK] Enregistrement terminé - traitement en cours via webhook Daily.co');

      recordingIdRef.current = null;
    });
  }, [state.roomUrl, user]);

    // Erreurs
    registerHandler('error', (event: any) => {
      console.error('❌ [DAILY] Erreur:', event);
      updateState({ 
        error: event?.errorMsg || 'Erreur inconnue',
        isLoading: false,
        connectionState: 'error'
      });
    });

    // Chat
    registerHandler('app-message', (event: any) => {
      console.log('💬 [DAILY] Message chat:', event);
    });

    // Partage d'écran
    registerHandler('track-started', (event: any) => {
      if (event?.track?.kind === 'video' && event?.participant?.screen) {
        console.log('🖥️ [DAILY] Partage d\'écran démarré');
        updateState({ isScreenSharing: true });
      }
    });

    registerHandler('track-stopped', (event: any) => {
      if (event?.track?.kind === 'video' && event?.participant?.screen) {
        console.log('🖥️ [DAILY] Partage d\'écran arrêté');
        updateState({ isScreenSharing: false });
      }
    });
  }

  async function createAndJoin(roomName?: string) {
    updateState({ isLoading: true, error: null });
    
    try {
      // Créer une nouvelle salle via l'API Daily.co
      const room = await dailyClient.createRoom({
        name: roomName,
        properties: {
          enable_recording: 'cloud',
          enable_chat: true,
          enable_screenshare: true,
          lang: 'fr',
          max_participants: 10
        }
      });

      console.log('🏠 [DAILY] Salle créée:', room);
      
      // Rejoindre la salle
      await joinRoom(room.url);
      
    } catch (error) {
      console.error('❌ [DAILY] Erreur création/connexion:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Erreur création salle',
        isLoading: false 
      });
    }
  }

  // 🔧 ANTI-DOUBLE JOIN GUARD
  const joinRoom = useCallback(async (roomUrl: string, userInitiated = false) => {
    console.log('🎯 [DAILY-JOIN] joinRoom appelé:', {
      timestamp: new Date().toISOString(),
      roomUrl,
      userInitiated,
      callStack: new Error().stack?.split('\n').slice(1, 5) // 4 premières lignes de la stack
    });
    
    if (!userInitiated) {
      console.error('🚫 [DAILY-JOIN] ATTENTION: joinRoom appelé sans action utilisateur explicite !');
      console.error('🚫 [DAILY-JOIN] Stack trace:', new Error().stack);
      return; // Bloquer les auto-joins
    }
    
    console.debug('[DAILY] joinRoom called with:', roomUrl);
    
    // Protection contre l'utilisation après destruction
    if (destroyedRef.current) {
      console.debug('[DAILY] joinRoom: hook was destroyed, aborting');
      return;
    }
    
    // Get or create frame
    const frame = ensureFrame();
    if (!frame) {
      console.error('[DAILY] joinRoom: no frame available');
      updateState({ 
        error: 'Container not ready',
        isLoading: false 
      });
      return;
    }
    
    // Check if already joined or joining
    if (isJoinedOrJoining(frame)) {
      console.debug('[DAILY] joinRoom: already joined or joining, skipping');
      return;
    }
    
    // Check if join is already in progress
    if (joiningRef.current) {
      console.debug('[DAILY] joinRoom: join already in progress, skipping');
      return;
    }
    
    updateState({ isLoading: true, error: null, roomUrl });
    joiningRef.current = true;
    
    try {
      console.log('[DAILY] joinRoom: starting join...');
      
      // Vérifier que l'iframe est bien dans le DOM avant de joindre
      const iframeBeforeJoin = document.querySelector('iframe[src*="daily.co"]');
      console.log(`[DAILY] Diagnostic avant join: ${iframeBeforeJoin ? '1' : '0'} iframe(s) dans le DOM`);
      
      // Demander les permissions caméra/microphone AVANT de joindre
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        // Libérer le stream immédiatement (Daily.co en créera un nouveau)
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ [DAILY] Permissions caméra/microphone accordées');
      } catch (permError) {
        console.warn('⚠️ [DAILY] Permissions refusées ou non disponibles:', permError);
        // Continuer quand même, Daily.co demandera les permissions
      }
      
      // Configuration pour joindre la room
      // Note: Pas de token nécessaire pour les rooms publiques (ne pas inclure la propriété)
      // showPrejoinUI n'est pas supporté dans cette version de Daily.co SDK
      console.log('[DAILY] Appel frame.join avec:', { url: roomUrl });
      await frame.join({ 
        url: roomUrl
        // Pas de token pour les rooms publiques - Daily.co détectera automatiquement
      });
      
      console.log('✅ [DAILY] joinRoom: join successful');
      
      // Vérifier que l'iframe est maintenant dans le DOM après le join
      const iframeAfterJoin = document.querySelector('iframe[src*="daily.co"]');
      console.log(`[DAILY] Diagnostic après join: ${iframeAfterJoin ? '1' : '0'} iframe(s) dans le DOM`);
      
      // Send probe after successful join (throttled)
      await sendFrontProbeThrottled('participant.joined', {
        room: new URL(roomUrl).pathname.slice(1),
        meeting_id: 'initial-join',
        participant: {
          user_name: user?.name || user?.email?.split('@')[0] || 'anonymous',
          session_id: 'initial-session'
        }
      }, user, participantsRef, meetingRef);
      
    } catch (error) {
      console.error('[DAILY] joinRoom: error:', error);
      
      // Gestion spécifique des erreurs
      let errorMessage = error instanceof Error ? error.message : 'Erreur connexion';
      
      // Gestion spécifique de l'erreur "token should be a string"
      if (errorMessage.includes('token should be a string') || errorMessage.includes('property \'token\'')) {
        console.error('❌ [DAILY] Erreur token - cela ne devrait plus arriver avec la correction');
        errorMessage = 'Erreur de configuration Daily.co. Veuillez recharger la page.';
      }
      
      if (errorMessage.includes('Duplicate DailyIframe')) {
        errorMessage = 'Une instance Daily.co est déjà active. Rechargez la page.';
        // Cleanup refs mais ne pas toucher au DOM manuellement
        frameRef.current = null;
        setSingleton(undefined);
        console.debug('[DAILY] Cleaned up refs after duplicate error');
      }
      
      if (errorMessage.includes('Extension context invalidated') || 
          errorMessage.includes('polyfill')) {
        errorMessage = 'Conflit avec extension navigateur. Essayez en mode incognito ou désactivez les extensions.';
      }
      
      // Diagnostic de l'iframe après erreur
      const iframeAfterError = document.querySelectorAll('iframe[src*="daily.co"]').length;
      console.error(`[DAILY] Diagnostic après erreur: ${iframeAfterError} iframe(s) dans le DOM`);
      
      updateState({ 
        error: errorMessage,
        isLoading: false,
        connectionState: 'error'
      });
    } finally {
      joiningRef.current = false;
      
      // Diagnostic final
      const iframeCount = document.querySelectorAll('iframe[src*="daily.co"]').length;
      console.log(`[DAILY] Diagnostic final: ${iframeCount} Daily iframe(s) dans le DOM`);
    }
  }, [ensureFrame, user]);

  async function leaveRoom() {
    try {
      const frame = frameRef.current;
      if (frame && isJoinedOrJoining(frame)) {
        console.log('[DAILY] leaveRoom: leaving...');

        // 1. Quitter la room
        await frame.leave();
        console.log('[DAILY] leaveRoom: left successfully');

        // 2. Nettoyer les event handlers
        eventHandlersRef.current.forEach(({ event, handler }) => {
          try {
            frame.off(event, handler);
          } catch (e) {
            console.debug('[DAILY] leaveRoom: error removing handler:', e);
          }
        });
        eventHandlersRef.current = [];

        // 3. NE PAS détruire l'iframe ici - laisser le cleanup useEffect le faire
        // Cela évite l'erreur React "NotFoundError: Failed to execute 'removeChild'"
        console.log('[DAILY] leaveRoom: iframe will be destroyed by cleanup');

        // 4. Reset l'état
        updateState({
          isJoined: false,
          isLoading: false,
          error: null,
          participants: [],
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false
        });

        console.log('[DAILY] leaveRoom: cleanup complete');
      } else {
        // Nettoyer recordingIdRef même si pas de frame
        recordingIdRef.current = null;
      }
    } catch (error) {
      console.error('[DAILY] leaveRoom: error:', error);

      // Reset l'état même en cas d'erreur
      updateState({
        isJoined: false,
        isLoading: false,
        error: null
      });
      recordingIdRef.current = null;
    }
  }

  async function toggleMute() {
    try {
      if (frameRef.current) {
        const newMuted = !state.isMuted;
        await frameRef.current.setLocalAudio(!newMuted);
        updateState({ isMuted: newMuted });
      }
    } catch (error) {
      console.error('[DAILY] toggleMute: error:', error);
    }
  }

  async function toggleCamera() {
    try {
      if (frameRef.current) {
        const newCameraOff = !state.isCameraOff;
        await frameRef.current.setLocalVideo(!newCameraOff);
        updateState({ isCameraOff: newCameraOff });
      }
    } catch (error) {
      console.error('[DAILY] toggleCamera: error:', error);
    }
  }

  async function startScreenShare() {
    try {
      if (frameRef.current) {
        await frameRef.current.startScreenShare();
      }
    } catch (error) {
      console.error('[DAILY] startScreenShare: error:', error);
    }
  }

  async function stopScreenShare() {
    try {
      if (frameRef.current) {
        await frameRef.current.stopScreenShare();
      }
    } catch (error) {
      console.error('[DAILY] stopScreenShare: error:', error);
    }
  }

  async function startRecording() {
    try {
      if (frameRef.current) {
        await frameRef.current.startRecording();
      }
    } catch (error) {
      console.error('[DAILY] startRecording: error:', error);
    }
  }

  async function stopRecording() {
    try {
      if (frameRef.current) {
        await frameRef.current.stopRecording();
      }
    } catch (error) {
      console.error('[DAILY] stopRecording: error:', error);
    }
  }

  function sendChatMessage(message: string) {
    try {
      if (frameRef.current) {
        frameRef.current.sendAppMessage({ type: 'chat', message }, '*');
      }
    } catch (error) {
      console.error('[DAILY] sendChatMessage: error:', error);
    }
  }

  function kickParticipant(participantId: string) {
    try {
      if (frameRef.current) {
        frameRef.current.updateParticipant(participantId, { eject: true });
      }
    } catch (error) {
      console.error('[DAILY] kickParticipant: error:', error);
    }
  }

  function destroy() {
    console.debug('[DAILY] destroy: manual destruction requested');
    
    // Marquer comme détruit
    destroyedRef.current = true;
    
    // Marquer comme en cours de destruction pour éviter les race conditions
    const frameToDestroy = frameRef.current;
    frameRef.current = null;
    
    if (frameToDestroy) {
      try {
        // Remove all event handlers
        eventHandlersRef.current.forEach(({ event, handler }) => {
          try {
            frameToDestroy.off(event as DailyEvent, handler);
          } catch (e) {
            // Silently ignore handler removal errors
          }
        });
        eventHandlersRef.current = [];
        
        frameToDestroy.destroy();
        setSingleton(undefined);
        updateState({
          callFrame: null,
          roomUrl: null,
          isJoined: false,
          isLoading: false,
          participants: [],
          localParticipant: null,
          connectionState: 'new'
        });
      } catch (error) {
        console.debug('[DAILY] destroy: error:', error);
      }
    }
    
    // Reset guards
    joiningRef.current = false;
    initializingRef.current = false;
    
    console.debug('[DAILY] destroy: cleanup completed');
  }

  return {
    state,
    createAndJoin,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    sendChatMessage,
    kickParticipant,
    destroy
  };