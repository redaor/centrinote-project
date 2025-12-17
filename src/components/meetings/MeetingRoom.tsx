// 🎥 Composant salle de réunion Daily.co
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, Phone, 
  Users, MessageCircle, Settings, Loader2, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useDaily } from '../../hooks/useDaily';
import { useMeetings } from '../../hooks/useMeetings';
import { useApp } from '../../contexts/AppContext';
import { useRecordingPolling } from '../../hooks/useRecordingPolling';
import { supabase } from '../../lib/supabase';

// 🔧 HELPERS HOISTÉS (function declarations pour éviter TDZ)

// Helper fonction pour attendre que le container soit monté
async function waitForContainer(containerRef: React.RefObject<HTMLDivElement>, maxAttempts = 50, delayMs = 50): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (containerRef?.current) {
      console.log(`✅ [ROOM] Container trouvé après ${i} tentatives (${i * delayMs}ms)`);
      return true;
    }
    if (i === 0) {
      console.log('⏳ [ROOM] En attente du container DOM...');
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  console.error(`⚠️ [ROOM] Container introuvable après attente (${maxAttempts * delayMs}ms)`);
  return false;
}

// Fonction pour initialiser Daily une fois le container prêt
async function initializeDaily(roomUrl: string, dailyHook: any, containerRef: React.RefObject<HTMLDivElement>, userInitiated = false) {
  if (!roomUrl) {
    console.error('❌ [ROOM] URL de la room manquante');
    return;
  }
  
  const containerReady = await waitForContainer(containerRef);
  if (!containerReady) {
    console.error('❌ [ROOM] Impossible d\'initialiser Daily sans container');
    return;
  }
  
  try {
    console.log('🎥 [ROOM] Initialisation Daily.co...', { roomUrl, userInitiated });
    await dailyHook.joinRoom(roomUrl, userInitiated);
    console.log('✅ [ROOM] Join OK');
  } catch (error) {
    console.error('❌ [ROOM] Erreur joinRoom:', error);
  }
}

// Fonction pour récupérer une réunion directement depuis Supabase
async function fetchMeetingDirectly(
  meetingId: string, 
  navigate: any, 
  setMeeting: (meeting: any) => void,
  dailyHook: any,
  containerRef: React.RefObject<HTMLDivElement>
) {
  try {
    console.log('🔍 [ROOM] Récupération directe pour ID:', meetingId);
    
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();
    
    console.log('📡 [ROOM] Réponse Supabase directe:', { data, error });
    console.log('[MEETING] fetched data', data);
    
    if (error) {
      console.error('❌ [ROOM] Erreur Supabase directe:', error);
      throw error;
    }
    
    if (!data) {
      console.error('❌ [ROOM] Aucune donnée trouvée pour ID:', meetingId);
      navigate('/meetings');
      return;
    }
    
    console.log('✅ [ROOM] Réunion récupérée directement:', {
      id: data.id,
      title: data.title,
      room_url: data.room_url,
      status: data.status
    });
    
    setMeeting(data);
    
    // Initialiser Daily.co (sans auto-join)
    if (data.room_url) {
      console.log('⏸️ [ROOM] Récupération directe - pas d\'auto-join');
      // Pas d'initialisation automatique ici
    }
    
  } catch (error) {
    console.error('❌ [ROOM] Erreur récupération directe:', error);
    navigate('/meetings');
  }
}

function detectProblematicExtensions(setExtensionWarning: (warning: boolean) => void) {
  // Chrome extensions souvent problématiques
  const problematicExtensions = [
    'chrome-extension',
    'moz-extension',
    'extension://'
  ];
  
  // Vérifier si il y a des scripts d'extension dans la page
  const scripts = Array.from(document.scripts);
  const hasExtensionScripts = scripts.some(script => 
    problematicExtensions.some(ext => script.src.includes(ext))
  );
  
  // Vérifier si window.chrome.runtime est modifié (signe d'extensions actives)
  const hasActiveExtensions = !!(window as any).chrome?.runtime?.getManifest;
  
  if (hasExtensionScripts || hasActiveExtensions) {
    console.warn('⚠️ [ROOM] Extensions détectées, risque de conflit avec Daily.co');
    setExtensionWarning(true);
  }
}

export function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { state } = useApp();
  const { darkMode } = state;
  
  // 🔍 TRACE: Montage du composant MeetingRoom
  console.log('🎬 [PREJOIN MOUNT] MeetingRoom composant monté:', {
    timestamp: new Date().toISOString(),
    meetingId: id,
    pathname: window.location.pathname,
    href: window.location.href
  });
  
  // 🔍 DEBUG: Instrumentation du montage/démontage
  useEffect(() => {
    const el = containerRef.current;
    console.debug('[ROOM] mount, container=', el);
    return () => console.debug('[ROOM] unmount, container=', el);
  }, []);
  
  const { meetings, loading: meetingsLoading, updateMeeting } = useMeetings();
  
  // ✅ CORRECTION TDZ : Initialiser meeting avec un state par défaut
  const [meeting, setMeeting] = useState<any>(null);
  const [directRoomUrl, setDirectRoomUrl] = useState<string | null>(null);
  const [extensionWarning, setExtensionWarning] = useState(false);
  const [testDirectAccess, setTestDirectAccess] = useState(false);
  
  // ✅ CORRECTION TDZ : useDaily appelé après que meeting soit défini
  // Passer une liste vide par défaut si meeting pas encore chargé
  const dailyHook = useDaily(containerRef, meeting?.participants ?? [], meeting);

  // 🔍 DEBUG: Tracer les changements de isRecording
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [wasRecording, setWasRecording] = useState(false);

  useEffect(() => {
    console.log('🔍 [ROOM-REC] État isRecording changé:', dailyHook.state.isRecording);

    // Suivre si l'enregistrement a déjà été démarré
    if (dailyHook.state.isRecording) {
      setWasRecording(true);
    }

    // Détecter quand l'enregistrement s'arrête (uniquement s'il a été démarré avant)
    if (!dailyHook.state.isRecording && wasRecording && !recordingStopped) {
      console.log('📹 [ROOM-REC] Enregistrement arrêté, démarrage polling...');
      setRecordingStopped(true);
    }
  }, [dailyHook.state.isRecording, wasRecording, recordingStopped]);

  // 📹 Polling pour récupérer l'URL de l'enregistrement
  const { downloadUrl, isPolling, error: pollingError } = useRecordingPolling({
    roomName: meeting?.room_name || null,
    meetingId: meeting?.id || null,
    isRecordingStopped: recordingStopped,
    enabled: true,
  });

  // Logger quand l'URL est disponible
  useEffect(() => {
    if (downloadUrl) {
      console.log('✅ [ROOM-REC] URL de téléchargement disponible:', downloadUrl);
    }
  }, [downloadUrl]);
  
  // 🔍 LOG DE DEBUG pour tracer les données
  useEffect(() => {
    if (meeting) {
      console.log('🔍 [ROOM-DEBUG] Meeting passé à useDaily:', {
        id: meeting.id,
        title: meeting.title,
        participants: meeting.participants,
        participantsCount: meeting.participants?.length || 0
      });
    }
  }, [meeting]);
  
  // 🔍 DEBUG: Log de rendu
  console.debug('[ROOM] render', { 
    hasContainer: !!containerRef.current, 
    meetingId: meeting?.id,
    roomUrl: meeting?.room_url 
  });
  
  // ✅ AUTO-JOIN PREVENTION: N'initialiser Daily que sur action utilisateur explicite
  const [userRequestedJoin, setUserRequestedJoin] = useState(false);
  
  useEffect(() => {
    if (!meeting?.room_url) return;
    if (!containerRef.current) return;
    if (!userRequestedJoin) {
      console.debug('⏸️ [ROOM-READY] Attente action utilisateur pour rejoindre', {
        title: meeting.title,
        participantsCount: meeting.participants?.length || 0,
        hasContainer: !!containerRef.current,
        userRequestedJoin
      });
      return; // 🚫 Pas d'auto-join
    }

    console.debug('✅ [ROOM-JOIN] Utilisateur a demandé à rejoindre', {
      title: meeting.title,
      participantsCount: meeting.participants?.length || 0,
      hasContainer: !!containerRef.current
    });

    // Initialiser Daily uniquement sur demande utilisateur
    handleInitializeDaily(meeting.room_url, true);
  }, [meeting?.room_url, meeting?.title, meeting?.participants?.length, containerRef.current, userRequestedJoin, handleInitializeDaily]);
  
  // Wrapper functions qui utilisent les helpers hissés
  const handleInitializeDaily = async (roomUrl: string, userInitiated = false) => {
    return initializeDaily(roomUrl, dailyHook, containerRef, userInitiated);
  };
  
  const handleFetchMeetingDirectly = async (meetingId: string) => {
    return fetchMeetingDirectly(meetingId, navigate, setMeeting, dailyHook, containerRef);
  };
  
  const handleTestDirectAccess = () => {
    console.log('🧪 [TEST] Accès direct déclenché manuellement');
    setTestDirectAccess(true);
    // Test direct sans attendre la redirection
    if (id) {
      handleFetchMeetingDirectly(id);
    }
  };

  // Détecter les extensions problématiques
  useEffect(() => {
    detectProblematicExtensions(setExtensionWarning);
  }, []);

  // Récupérer les infos de la réunion
  useEffect(() => {
    console.log('[MEETING] mount id=', id);
    console.log('[MEETING] DailyIframe?', !!(window as any).DailyIframe);
    console.log('🔍 [ROOM] MeetingRoom monté avec ID:', id);
    console.log('🔍 [ROOM] État chargement:', {
      id,
      meetingsLoading,
      meetingsCount: meetings.length,
      containerReady: !!containerRef?.current
    });
    console.log('🔍 [ROOM] Meetings disponibles:', meetings.map(m => ({ 
      id: m.id, 
      title: m.title, 
      room_url: m.room_url,
      status: m.status 
    })));

    if (!meetingsLoading && meetings.length > 0 && id) {
      const foundMeeting = meetings.find(m => m.id === id);
      if (foundMeeting) {
        console.log('✅ [ROOM] Réunion trouvée:', {
          id: foundMeeting.id,
          title: foundMeeting.title,
          room_url: foundMeeting.room_url,
          status: foundMeeting.status,
          participants: foundMeeting.participants,
          participantsCount: foundMeeting.participants?.length || 0
        });
        console.log('👥 [ROOM] Participants détaillés:', foundMeeting.participants);
        
        setMeeting(foundMeeting);
        
        // ⏳ L'initialisation se fera dans le useEffect qui attend les données
        console.log('⏳ [ROOM] Meeting défini, attente données complètes...');
        
        // Marquer comme active si ce n'est pas déjà fait
        if (foundMeeting.status === 'scheduled') {
          updateMeeting(id, { 
            status: 'active', 
            started_at: new Date().toISOString() 
          });
        }
      } else {
        console.error('❌ [ROOM] Réunion non trouvée dans la liste:', id);
        console.log('📋 [ROOM] ID recherché:', id, 'Type:', typeof id);
        console.log('📋 [ROOM] IDs disponibles:', meetings.map(m => ({
          id: m.id,
          type: typeof m.id,
          match: m.id === id,
          title: m.title
        })));
        console.log('🔍 [ROOM] Tentative de récupération directe depuis Supabase...');

        // Essayer de récupérer directement depuis Supabase
        handleFetchMeetingDirectly(id);
      }
    } else if (!meetingsLoading && meetings.length === 0) {
      console.warn('⚠️ [ROOM] Aucune réunion chargée depuis Supabase');
      console.log('🔧 [ROOM] Tentative de récupération directe depuis API...');

      // Solution de secours : récupérer la réunion directement
      if (id) {
        fetch(`/.netlify/functions/get-meeting?id=${id}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.meeting) {
              console.log('✅ [ROOM] Réunion récupérée directement:', data.meeting);
              setMeeting(data.meeting);
              handleInitializeDaily(data.meeting.room_url);
            }
          })
          .catch(err => {
            console.error('❌ [ROOM] Erreur récupération directe:', err);
            // Dernière solution : construire l'URL Daily.co
            const roomUrl = `https://centrinote.daily.co/centrinote-${id}`;
            console.log('🆘 [ROOM] URL de secours:', roomUrl);
            setDirectRoomUrl(roomUrl);

            // Utiliser la fonction d'attente pour le fallback
            handleInitializeDaily(roomUrl);
          });
      }
    }
  }, [id, meetings, meetingsLoading, handleFetchMeetingDirectly, updateMeeting]); // ✅ Retirer dailyHook des dépendances

  // Gérer la déconnexion
  const handleLeave = async () => {
    console.log('🚪 [ROOM] Début processus de déconnexion...');
    
    // Flag pour éviter les re-renders pendant la navigation
    let isNavigating = false;
    
    try {
      // 1. D'abord quitter la room Daily (ATTENDRE complètement pour éviter erreur React)
      if (dailyHook && dailyHook.leaveRoom) {
        console.log('📤 [ROOM] Fermeture de la room Daily.co...');
        try {
          await dailyHook.leaveRoom();
          console.log('✅ [ROOM] Room Daily.co fermée proprement');
        } catch (dailyError) {
          console.warn('⚠️ [ROOM] Erreur lors de la fermeture Daily.co (non bloquant):', dailyError);
        }
      }
      
      // 2. Laisser le temps à React de finir son cycle de nettoyage (IMPORTANT pour éviter erreur React)
      // Utiliser requestAnimationFrame pour synchroniser avec le cycle de rendu React
      await new Promise(res => {
        requestAnimationFrame(() => {
          setTimeout(res, 100); // Réduit à 100ms car requestAnimationFrame ajoute déjà un délai
        });
      });
      console.log('✅ [ROOM] Délai de nettoyage React terminé');
      
      // 2. Marquer la réunion comme terminée via end-meeting (en arrière-plan, non bloquant)
      // Note: Cette requête peut être annulée par la navigation, c'est normal et non bloquant
      if (meeting && meeting.status === 'active') {
        console.log('✏️ [ROOM] Mise à jour statut réunion via end-meeting...');
        fetch(`/.netlify/functions/end-meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: meeting.id }),
        })
        .then(res => res.json())
        .then(result => {
          if (result.error) {
            console.error('❌ [ROOM] Erreur mise à jour statut:', result.error);
          } else {
            console.log('✅ [ROOM] Réunion marquée comme terminée');
          }
        })
        .catch(err => {
          // Ignorer les erreurs de navigation (Failed to fetch est normal lors de window.location.href)
          if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
            console.log('ℹ️ [ROOM] Requête annulée par navigation (normal)');
          } else {
            console.error('❌ [ROOM] Erreur lors de la mise à jour:', err);
          }
        });
      }
      
      // 3. Navigation après nettoyage complet (évite erreur React NotFoundError)
      const meetingId = meeting?.id;
      const url = meetingId
        ? `/meetings?completed=${meetingId}`
        : '/meetings';
      console.log('🌐 [ROOM] Navigation vers:', url);
      isNavigating = true;

      // ✅ FIX: Utiliser window.location.href pour forcer le rechargement complet
      // Cela évite les problèmes de page blanche causés par React Router
      console.log('🔄 [ROOM] Navigation forcée avec window.location.href');
      window.location.href = url;
      
    } catch (error) {
      console.error('❌ [ROOM] Erreur lors de la déconnexion:', error);
      
      // Fallback : forcer la navigation même en cas d'erreur
      if (!isNavigating) {
        console.log('🆘 [ROOM] Navigation forcée suite à erreur...');
        window.location.href = '/meetings';
      }
    }
  };

  // Chargement initial
  if (meetingsLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
            darkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Chargement de la réunion...
          </p>
        </div>
      </div>
    );
  }

  // Interface d'attente avec bouton de connexion explicite
  if (!meeting && !testDirectAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <AlertCircle className={`w-12 h-12 mx-auto mb-4 ${
            darkMode ? 'text-red-400' : 'text-red-600'
          }`} />
          <h2 className={`text-xl font-semibold mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Réunion introuvable
          </h2>
          <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Cette réunion n'existe pas ou vous n'y avez pas accès.
          </p>
          
          {/* BOUTON TEST BYPASS */}
          <div className="space-y-3">
            <button
              onClick={handleTestDirectAccess}
              className="block mx-auto px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              🧪 TEST: Bypass redirection
            </button>
            <button
              onClick={() => navigate('/meetings')}
              className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour aux réunions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Interface de pré-connexion avec bouton explicite
  if (meeting && !userRequestedJoin) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className={`p-8 rounded-xl ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border shadow-lg`}>
            <Video className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
            
            <h2 className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {meeting.title}
            </h2>
            
            {meeting.description && (
              <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {meeting.description}
              </p>
            )}

            <div className={`mb-6 p-4 rounded-lg ${
              darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
            } border`}>
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{meeting.participants?.length || 0} participants</span>
                </div>
                {meeting.status && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Salle prête</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 [USER-ACTION] Utilisateur demande à rejoindre la réunion');
                  console.log('🎯 [USER-ACTION] État avant:', { userRequestedJoin, hasMeeting: !!meeting, hasRoomUrl: !!meeting?.room_url });
                  setUserRequestedJoin(true);
                  
                  // Forcer le re-render et l'initialisation
                  setTimeout(() => {
                    console.log('🎯 [USER-ACTION] État après timeout:', { userRequestedJoin: true });
                    if (meeting?.room_url && containerRef.current) {
                      handleInitializeDaily(meeting.room_url, true).catch(err => {
                        console.error('❌ [USER-ACTION] Erreur lors de l\'initialisation:', err);
                      });
                    }
                  }, 100);
                }}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold cursor-pointer active:scale-95"
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              >
                <Video className="w-5 h-5" />
                <span>Rejoindre la réunion</span>
              </button>
              
              <button
                onClick={() => navigate('/meetings')}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux réunions</span>
              </button>
            </div>

            <p className={`mt-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              💡 Cliquez sur "Rejoindre" pour démarrer la réunion vidéo
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ pointerEvents: 'auto' }}>
      {/* Header - Style sombre pour salle de réunion */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeave}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quitter</span>
            </button>
            
            <div>
              <h1 className="text-xl font-bold text-white">
                {meeting?.title || 'Réunion'}
              </h1>
              {meeting?.description && (
                <p className="text-sm text-gray-400">
                  {meeting.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Statut de connexion */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                dailyHook.state.isJoined ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-300">
                {dailyHook.state.isJoined ? 'Connecté' : 'Connexion...'}
              </span>
            </div>
            
            {/* Nombre de participants */}
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">
                {dailyHook.state.participants.length}
              </span>
            </div>
            
            {/* Indicateur d'enregistrement */}
            {(() => {
              const isRec = dailyHook.state.isRecording;
              if (isRec) console.log('🔴 [ROOM-UI] Affichage indicateur REC');
              return isRec && (
                <div className="flex items-center space-x-2 text-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">REC</span>
                </div>
              );
            })()}

            {/* Indicateur de polling de l'enregistrement */}
            {isPolling && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Traitement de l'enregistrement...</span>
              </div>
            )}

            {/* Succès récupération recording */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors group"
                title="Télécharger l'enregistrement"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm group-hover:underline">Télécharger l'enregistrement</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Zone de la vidéo */}
      <div className="flex-1 relative" style={{ pointerEvents: 'auto' }}>
        {/* Conteneur Daily.co */}
        <div 
          ref={containerRef} 
          className="w-full h-full bg-black rounded-lg"
          style={{ 
            pointerEvents: 'auto', 
            zIndex: 1,
            position: 'relative'
          }}
        />
        
        {/* Message de chargement */}
        {dailyHook.state.isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Connexion à la réunion...</p>
            </div>
          </div>
        )}
        
        {/* Message d'erreur */}
        {dailyHook.state.error && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white max-w-md mx-auto px-6">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Erreur de connexion</h3>
              <p className="text-sm text-gray-300 mb-4">{dailyHook.state.error}</p>
              
              {/* Instructions spéciales pour les conflits d'extensions */}
              {dailyHook.state.error.includes('extension') && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">💡 Solution recommandée :</h4>
                  <ul className="text-sm text-yellow-200 text-left space-y-1">
                    <li>• Ouvrez en <strong>mode incognito</strong> (Ctrl+Shift+N)</li>
                    <li>• Ou désactivez temporairement vos extensions</li>
                    <li>• Ou utilisez le lien direct ci-dessous</li>
                  </ul>
                </div>
              )}
              
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => {
                    console.log('🔄 [ROOM] Nouvelle tentative...');
                    if (meeting?.room_url) {
                      handleInitializeDaily(meeting.room_url);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
                <a
                  href={meeting?.room_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🚀 Ouvrir Daily.co directement
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Contrôles de la réunion */}
        {dailyHook.state.isJoined && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-3 bg-black/70 rounded-full px-6 py-3 backdrop-blur-sm">
              {/* Micro */}
              <button
                onClick={dailyHook.toggleMute}
                className={`p-3 rounded-full transition-colors ${
                  dailyHook.state.isMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
                title={dailyHook.state.isMuted ? 'Activer le micro' : 'Couper le micro'}
              >
                {dailyHook.state.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Caméra */}
              <button
                onClick={dailyHook.toggleCamera}
                className={`p-3 rounded-full transition-colors ${
                  dailyHook.state.isCameraOff 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
                title={dailyHook.state.isCameraOff ? 'Activer la caméra' : 'Couper la caméra'}
              >
                {dailyHook.state.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Partage d'écran */}
              <button
                onClick={dailyHook.state.isScreenSharing ? dailyHook.stopScreenShare : dailyHook.startScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  dailyHook.state.isScreenSharing 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
                title={dailyHook.state.isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
              >
                <Monitor className="w-5 h-5" />
              </button>

              {/* Enregistrement */}
              <button
                onClick={dailyHook.state.isRecording ? dailyHook.stopRecording : dailyHook.startRecording}
                className={`p-3 rounded-full transition-colors ${
                  dailyHook.state.isRecording 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                } text-white`}
                title={dailyHook.state.isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full ${
                    dailyHook.state.isRecording ? 'bg-white animate-pulse' : 'bg-white'
                  }`} />
                </div>
              </button>

              {/* Quitter */}
              <button
                onClick={handleLeave}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                title="Quitter la réunion"
              >
                <Phone className="w-5 h-5 transform rotate-[135deg]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}