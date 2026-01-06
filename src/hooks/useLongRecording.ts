/**
 * Hook pour enregistrement audio long (cours)
 * - Enregistrement par chunks automatiques
 * - Transcription via OpenAI Whisper API
 * - Format webm mono 48 kHz
 * - Indicateur de niveau audio en temps réel
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 🔋 Déclaration de type pour WakeLockSentinel (API moderne des navigateurs)
// Utilisation de declare global pour éviter les conflits avec les types existants
declare global {
  interface WakeLockSentinel extends EventTarget {
    readonly type: 'screen';
    readonly released: boolean;
    release(): Promise<void>;
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
  }

  interface WakeLock {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  }

  interface Navigator {
    wakeLock?: WakeLock;
  }
}

interface UseLongRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  currentChunk: number;
  elapsedTime: number; // en secondes
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcribedText: string | null;
  error: string | null;
  audioStream: MediaStream | null; // Stream audio pour l'indicateur de niveau
  mergeTranscriptionChunks: (chunk1: string, chunk2: string) => string; // Fonction de fusion exportée
  isWakeLockActive: boolean; // ✅ Indicateur pour l'UI
}

const CHUNK_DURATION_MS = 30 * 60 * 1000; // 30 minutes en millisecondes
const OVERLAP_DURATION_MS = 5 * 1000; // 5 secondes de chevauchement entre chunks
// Note: On laisse le navigateur capturer à 48 kHz (meilleure compatibilité)
// Whisper rééchantillonne automatiquement à 16 kHz, donc pas besoin de forcer ici
const SAMPLE_RATE = 48000; // 48 kHz (meilleure compatibilité navigateurs)
const CHANNELS = 1; // Mono
// Optimisation: 32 kbps au lieu de 128 kbps = réduction de ~75% de la taille du fichier
// Cela réduit le temps d'upload et le temps de traitement
const AUDIO_BITRATE = 32000; // 32 kbps (suffisant pour la parole, Whisper fonctionne bien à ce bitrate)

export function useLongRecording(): UseLongRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldContinueRef = useRef<boolean>(false);
  // FIX: Set pour stocker les timestamps des chunks déjà envoyés à l'API
  const sentChunksRef = useRef<Set<number>>(new Set());
  // 🎯 Overlap management
  const nextRecorderRef = useRef<MediaRecorder | null>(null);
  const isOverlappingRef = useRef<boolean>(false);
  const nextChunksRef = useRef<Blob[]>([]);
  const transcriptionsRef = useRef<Array<{ chunkNumber: number; text: string }>>([]);
  // 🔋 Wake Lock management
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 🎯 Fonction pour détecter l'overlap entre deux transcriptions
  const findOverlap = useCallback((chunk1: string, chunk2: string, minOverlapWords: number = 5): number => {
    const words1 = chunk1.trim().split(/\s+/);
    const words2 = chunk2.trim().split(/\s+/);
    
    // Essayer différents points de départ dans chunk2
    for (let start = 0; start < Math.min(words2.length, words1.length); start++) {
      let matchCount = 0;
      
      // Comparer les mots de la fin de chunk1 avec le début de chunk2
      for (let i = 0; i < Math.min(words1.length - start, words2.length - start); i++) {
        const word1 = words1[words1.length - start - i]?.toLowerCase().replace(/[.,!?;:]/g, '') || '';
        const word2 = words2[i]?.toLowerCase().replace(/[.,!?;:]/g, '') || '';
        
        if (word1 === word2 && word1.length > 0) {
          matchCount++;
        } else if (matchCount > 0) {
          break; // Série brisée, mais on a déjà des correspondances
        }
      }
      
      // Si on a trouvé assez de mots communs, c'est probablement l'overlap
      if (matchCount >= minOverlapWords) {
        return start;
      }
    }
    
    return -1; // Pas d'overlap trouvé
  }, []);

  // 🔋 Fonction pour demander le Wake Lock
  const requestWakeLock = useCallback(async () => {
    // ✅ 1. Vérifier si un wake lock est déjà actif (éviter les doublons)
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      console.log('🔋 Wake Lock déjà actif, pas de nouvelle demande');
      return;
    }

    try {
      // Vérifier si l'API est disponible
      if ('wakeLock' in navigator && navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        
        // Écouter l'événement release (quand le système libère le wake lock)
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔋 Wake Lock libéré par le système');
          wakeLockRef.current = null;
          setIsWakeLockActive(false); // ✅ Mettre à jour l'état
        });
        
        console.log('🔋 Wake Lock activé');
        setIsWakeLockActive(true); // ✅ Mettre à jour l'état pour l'UI
      } else {
        console.warn('⚠️ Wake Lock API non disponible dans ce navigateur');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erreur inconnue';
      
      // ✅ 3. Détection des erreurs spécifiques (batterie faible, eco-mode)
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('NotAllowed')) {
        console.warn('⚠️ Wake Lock refusé: Permission refusée ou mode économie d\'énergie actif');
      } else if (errorMessage.includes('AbortError')) {
        console.warn('⚠️ Wake Lock annulé: Possiblement dû au mode économie d\'énergie');
      } else {
        console.error('❌ Wake Lock erreur:', err);
      }
      
      // Ne pas bloquer l'enregistrement si le wake lock échoue
      wakeLockRef.current = null;
    }
  }, []);

  // 🔋 Fonction pour libérer le Wake Lock
  const releaseWakeLock = useCallback(() => {
    if (!wakeLockRef.current) {
      return; // Déjà libéré ou jamais activé
    }

    // ✅ 2. Utiliser try/finally pour garantir la réinitialisation
    try {
      if (!wakeLockRef.current.released) {
        wakeLockRef.current.release();
        console.log('🔋 Wake Lock libéré');
      }
    } catch (err) {
      console.error('❌ Erreur lors de la libération du Wake Lock:', err);
    } finally {
      // Garantir que la ref est toujours réinitialisée, même en cas d'erreur
      wakeLockRef.current = null;
    }
  }, []);

  // 🎯 Fonction pour fusionner deux transcriptions en gérant l'overlap
  const mergeTranscriptionChunks = useCallback((chunk1: string, chunk2: string): string => {
    if (!chunk1.trim() || !chunk2.trim()) {
      return (chunk1.trim() + ' ' + chunk2.trim()).trim();
    }

    const overlapIndex = findOverlap(chunk1, chunk2);
    
    if (overlapIndex === -1) {
      // Pas d'overlap détecté, concaténation simple
      return chunk1.trim() + ' ' + chunk2.trim();
    }
    
    // Extraire la partie unique de chunk2 (sans l'overlap)
    const words2 = chunk2.trim().split(/\s+/);
    const uniquePart2 = words2.slice(overlapIndex).join(' ');
    
    // Fusionner en excluant l'overlap
    return chunk1.trim() + ' ' + uniquePart2;
  }, [findOverlap]);

  // Demander permission micro (une seule fois)
  const requestMicrophonePermission = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: CHANNELS,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        throw new Error('Permission micro refusée. Veuillez autoriser l\'accès au microphone.');
      }
      throw new Error(`Erreur d'accès au microphone: ${errorMessage}`);
    }
  }, []);

  // Transcrire audio via Edge Function Supabase (utilise OPENAI_TRANSCRIPTION_AUDIO_KEY depuis Supabase)
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // Récupérer la session Supabase pour l'authentification
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour transcrire l\'audio');
    }

    // Convertir Blob en File pour FormData
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioFile);

    // Appeler l'Edge Function Supabase (upload)
    console.log('🎤 Appel Edge Function transcribe-audio-upload...', {
      url: `${supabaseUrl}/functions/v1/transcribe-audio-upload`,
      fileSize: audioBlob.size,
      fileType: audioBlob.type,
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: formData,
    });

    console.log('📡 Réponse Edge Function:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });

    if (!response.ok) {
      // Vérifier si c'est une redirection HTML (404 Netlify)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const htmlText = await response.text();
        console.error('❌ Réponse HTML inattendue (redirection Netlify?):', htmlText.slice(0, 200));
        throw new Error('Edge Function non trouvée. Vérifiez que l\'Edge Function est déployée sur Supabase.');
      }

      const errorData = await response.json().catch(() => {
        // Si la réponse n'est pas du JSON, c'est probablement une erreur de déploiement
        return { error: `Erreur ${response.status}: ${response.statusText}. L'Edge Function n'est peut-être pas déployée.` };
      });
      
      console.error('❌ Erreur Edge Function:', errorData);
      throw new Error(errorData.error || `Erreur API: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Transcription réussie:', {
      textLength: data.text?.length || 0,
      preview: data.text?.slice(0, 50) || 'vide',
      language: data.language || 'auto',
      isMultilingual: data.isMultilingual || false,
    });
    
    // FIX: Support multilingue - Retourner le texte avec métadonnées si disponibles
    let finalText = data.text || '';
    
    // Si multilingue détecté, on peut ajouter un indicateur visuel (optionnel)
    if (data.isMultilingual && finalText) {
      // Whisper gère déjà bien le multilingue, on retourne le texte tel quel
      // L'utilisateur verra le texte mixte directement dans la note
      console.log('🌍 Transcription multilingue détectée');
    }
    
    return finalText;
  }, []);

  // Traiter un chunk (transcription)
  const processChunk = useCallback(async (audioBlob: Blob, chunkNumber: number): Promise<string> => {
    // FIX: Créer un timestamp unique pour ce chunk basé sur le numéro et l'heure de début
    const chunkTimestamp = startTimeRef.current + chunkNumber;
    
    // FIX: Vérifier si ce chunk a déjà été envoyé
    if (sentChunksRef.current.has(chunkTimestamp)) {
      console.log(`⏭️ Chunk ${chunkNumber} (timestamp: ${chunkTimestamp}) déjà envoyé, ignoré`);
      return '';
    }

    setIsTranscribing(true);
    setError(null);

    try {
      console.log(`🎤 Transcription du chunk ${chunkNumber} (timestamp: ${chunkTimestamp})...`);
      // FIX: Marquer ce chunk comme envoyé AVANT l'appel API
      sentChunksRef.current.add(chunkTimestamp);
      
      const text = await transcribeAudio(audioBlob);
      console.log(`✅ Chunk ${chunkNumber} transcrit:`, text.slice(0, 100) + '...');
      return text;
    } catch (err) {
      // FIX: En cas d'erreur, retirer le chunk du Set pour permettre une nouvelle tentative
      sentChunksRef.current.delete(chunkTimestamp);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de transcription';
      console.error(`❌ Erreur transcription chunk ${chunkNumber}:`, err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, [transcribeAudio]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscribedText(null);
      setCurrentChunk(0);
      setElapsedTime(0);
      chunksRef.current = [];
      // FIX: Réinitialiser le Set des chunks envoyés
      sentChunksRef.current.clear();
      // 🎯 Réinitialiser les refs d'overlap
      nextRecorderRef.current = null;
      isOverlappingRef.current = false;
      nextChunksRef.current = [];
      transcriptionsRef.current = [];
      // 🔋 S'assurer que le Wake Lock est libéré avant de démarrer (au cas où)
      releaseWakeLock();

      // Demander permission micro
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;
      setAudioStream(stream); // Exposer le stream pour l'indicateur

      // Créer MediaRecorder avec configuration optimisée pour la transcription
      // 16 kHz mono 32 kbps = taille réduite de ~75% par rapport à 48 kHz 128 kbps
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: AUDIO_BITRATE, // 32 kbps (optimal pour transcription)
      };

      // Vérifier si le format est supporté
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        // Fallback vers le format par défaut
        delete options.mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Gérer les données enregistrées
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 🎯 Gérer l'arrêt du chunk avec overlap
      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length === 0) {
          // Si pas de données et qu'on continue, utiliser le nextRecorder qui a déjà démarré avec overlap
          if (shouldContinueRef.current && nextRecorderRef.current) {
            console.log('🔄 Pas de données dans chunk actuel, utilisation du nextRecorder (overlap)');
            // Transférer les chunks du nextRecorder
            chunksRef.current = [...nextChunksRef.current];
            nextChunksRef.current = [];
            // Le nextRecorder devient le recorder actuel
            nextRecorderRef.current.onstop = mediaRecorder.onstop;
            mediaRecorderRef.current = nextRecorderRef.current;
            nextRecorderRef.current = null;
            isOverlappingRef.current = false;
            // Le nextRecorder continue déjà depuis T-5s, pas besoin de redémarrer
          }
          return;
        }

        const chunkBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const chunkNumber = currentChunk;
        chunksRef.current = []; // Réinitialiser pour le prochain chunk

        // Traiter le chunk (transcription)
        try {
          const transcribed = await processChunk(chunkBlob, chunkNumber);
          
          // Stocker cette transcription pour la fusion ultérieure dans le composant
          transcriptionsRef.current.push({ chunkNumber, text: transcribed });
          
          // Pour l'instant, retourner la transcription telle quelle
          // La fusion sera gérée dans le composant LongRecButton
          setTranscribedText(transcribed);
          
        } catch (err) {
          console.error('Erreur lors du traitement du chunk:', err);
        }

        // 🎯 Si on continue l'enregistrement, le nextRecorder est déjà démarré (overlap à T-5s)
        if (shouldContinueRef.current && streamRef.current) {
          if (nextRecorderRef.current) {
            // Le nextRecorder a déjà démarré avec overlap à T-5s
            // Transférer ses chunks dans chunksRef et lui donner le handler onstop
            chunksRef.current = [...nextChunksRef.current];
            nextChunksRef.current = [];
            
            // Le nextRecorder devient le recorder actuel et hérite du handler onstop
            nextRecorderRef.current.onstop = mediaRecorder.onstop;
            mediaRecorderRef.current = nextRecorderRef.current;
            nextRecorderRef.current = null;
            isOverlappingRef.current = false;
            
            const nextChunkNumber = chunkNumber + 1;
            setCurrentChunk(nextChunkNumber);
            
            // Réinitialiser le timer pour le prochain chunk (en tenant compte de l'overlap)
            startTimeRef.current = Date.now() - OVERLAP_DURATION_MS;
            setElapsedTime(Math.floor(OVERLAP_DURATION_MS / 1000));
            
            console.log(`🔄 Passage au chunk ${nextChunkNumber} (overlap actif depuis T-5s)`);
          } else {
            // Cas de fallback : démarrer normalement (ne devrait pas arriver avec overlap)
            console.warn('⚠️ nextRecorder non trouvé, démarrage normal');
            const nextOptions: MediaRecorderOptions = {
              mimeType: 'audio/webm;codecs=opus',
              audioBitsPerSecond: AUDIO_BITRATE,
            };
            if (!MediaRecorder.isTypeSupported(nextOptions.mimeType!)) {
              delete nextOptions.mimeType;
            }

            const nextRecorder = new MediaRecorder(streamRef.current, nextOptions);
            const nextChunks: Blob[] = [];
            
            nextRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                nextChunks.push(event.data);
              }
            };

            nextRecorder.onstop = mediaRecorder.onstop;
            mediaRecorderRef.current = nextRecorder;
            
            setTimeout(() => {
              if (nextRecorder && nextRecorder.state === 'inactive' && streamRef.current && shouldContinueRef.current) {
                nextRecorder.start();
                startTimeRef.current = Date.now();
                setElapsedTime(0);
                const nextChunk = chunkNumber + 1;
                setCurrentChunk(nextChunk);
                console.log(`🎤 Chunk ${nextChunk} redémarré (fallback, sans overlap)`);
              }
            }, 1000);
          }
        } else {
          // Arrêt définitif
          setIsRecording(false);
          isOverlappingRef.current = false;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      };

      // Démarrer l'enregistrement
      mediaRecorder.start();
      setIsRecording(true);
      shouldContinueRef.current = true; // Marquer qu'on doit continuer après chaque chunk
      startTimeRef.current = Date.now();

      // 🔋 Activer le Wake Lock pour empêcher la mise en veille
      await requestWakeLock();

      // 🎯 Mettre à jour le temps écoulé toutes les secondes et gérer l'overlap
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);

        const timeUntilEnd = (CHUNK_DURATION_MS / 1000) - elapsed;
        
        // 🎯 Démarrer le prochain MediaRecorder à T-5s (overlap)
        if (timeUntilEnd <= OVERLAP_DURATION_MS / 1000 && !isOverlappingRef.current && shouldContinueRef.current && streamRef.current) {
          console.log('🔄 Démarrage overlap à T-5s');
          
          const nextOptions: MediaRecorderOptions = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: AUDIO_BITRATE,
          };
          if (!MediaRecorder.isTypeSupported(nextOptions.mimeType!)) {
            delete nextOptions.mimeType;
          }

          const nextRecorder = new MediaRecorder(streamRef.current, nextOptions);
          nextRecorderRef.current = nextRecorder;
          
          // Le nextRecorder utilisera le même handler que le recorder actuel
          // On stocke ses chunks dans nextChunksRef temporairement
          nextRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              nextChunksRef.current.push(event.data);
            }
          };
          
          // Le nextRecorder héritera du handler onstop quand il deviendra le recorder actuel
          // Pour l'instant, on le stocke juste dans nextRecorderRef

          nextRecorder.start();
          isOverlappingRef.current = true;
          console.log(`🔄 Chunk suivant démarré avec overlap (T-5s avant la fin du chunk ${currentChunk + 1})`);
        }

        // 🎯 Arrêter le chunk actuel à T=30:00
        if (elapsed >= CHUNK_DURATION_MS / 1000) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            // Note: Le nextRecorder continue déjà depuis T-5s
          }
        }
      }, 1000);

      console.log('🎤 Enregistrement démarré');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ Erreur démarrage enregistrement:', err);
    }
  }, [currentChunk, processChunk, requestMicrophonePermission, mergeTranscriptionChunks]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    shouldContinueRef.current = false; // Ne plus continuer automatiquement
    isOverlappingRef.current = false; // Arrêter l'overlap
    
    // Arrêter le MediaRecorder actuel
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Arrêter le nextRecorder si en cours d'overlap
    if (nextRecorderRef.current && nextRecorderRef.current.state !== 'inactive') {
      nextRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setAudioStream(null); // Nettoyer le stream
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Nettoyer les refs d'overlap
    nextRecorderRef.current = null;
    nextChunksRef.current = [];

    // 🔋 Libérer le Wake Lock
    releaseWakeLock();

    setIsRecording(false);
    console.log('🛑 Enregistrement arrêté');
  }, []);

  // ✅ 7. Clean-up : Libérer le Wake Lock lors du démontage du composant
  useEffect(() => {
    return () => {
      // Cleanup lors du démontage
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        try {
          wakeLockRef.current.release();
          console.log('🔋 Wake Lock libéré (cleanup unmount)');
        } catch (err) {
          console.error('❌ Erreur lors de la libération du Wake Lock (cleanup):', err);
        } finally {
          wakeLockRef.current = null;
        }
      }
    };
  }, []);

  return {
    isRecording,
    isTranscribing,
    currentChunk,
    elapsedTime,
    startRecording,
    stopRecording,
    transcribedText,
    error,
    audioStream,
    mergeTranscriptionChunks, // Exporter la fonction de fusion
    isWakeLockActive, // ✅ Exporter l'état du wake lock pour l'UI
  };
}
