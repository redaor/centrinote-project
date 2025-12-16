/**
 * Hook pour enregistrement audio long (cours)
 * - Enregistrement par chunks automatiques
 * - Transcription via OpenAI Whisper API
 * - Format webm mono 48 kHz
 * - Indicateur de niveau audio en temps réel
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
}

const CHUNK_DURATION_MS = 30 * 60 * 1000; // 30 minutes en millisecondes
const SAMPLE_RATE = 48000; // 48 kHz
const CHANNELS = 1; // Mono

export function useLongRecording(): UseLongRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldContinueRef = useRef<boolean>(false);
  // FIX: Set pour stocker les timestamps des chunks déjà envoyés à l'API
  const sentChunksRef = useRef<Set<number>>(new Set());

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

    // Appeler l'Edge Function Supabase
    console.log('🎤 Appel Edge Function transcribe-audio...', {
      url: `${supabaseUrl}/functions/v1/transcribe-audio`,
      fileSize: audioBlob.size,
      fileType: audioBlob.type,
    });

    const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
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

      // Demander permission micro
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;
      setAudioStream(stream); // Exposer le stream pour l'indicateur

      // Créer MediaRecorder avec configuration webm mono 48 kHz
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000, // 128 kbps
      };

      // Vérifier si le format est supporté
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        // Fallback vers le format par défaut
        delete options.mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Gérer les données enregistrées
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          chunksRef.current.push(event.data);
        }
      };

      // FIX: Gérer l'arrêt du chunk et redémarrer
      mediaRecorder.onstop = async () => {
        if (chunks.length === 0) {
          // Si pas de données, redémarrer directement si on continue
          if (shouldContinueRef.current && streamRef.current) {
            const nextRecorder = new MediaRecorder(streamRef.current, options);
            const nextChunks: Blob[] = [];
            
            nextRecorder.ondataavailable = mediaRecorder.ondataavailable;
            nextRecorder.onstop = mediaRecorder.onstop;
            mediaRecorderRef.current = nextRecorder;
            
            setTimeout(() => {
              if (nextRecorder.state === 'inactive' && streamRef.current && shouldContinueRef.current) {
                nextRecorder.start();
                startTimeRef.current = Date.now();
                setElapsedTime(0);
                const nextChunk = currentChunk + 1;
                setCurrentChunk(nextChunk);
                console.log(`🎤 Chunk ${nextChunk} redémarré`);
              }
            }, 1000);
          }
          return;
        }

        const chunkBlob = new Blob(chunks, { type: 'audio/webm' });
        const chunkNumber = currentChunk + 1;
        setCurrentChunk(chunkNumber);
        chunks.length = 0; // Réinitialiser pour le prochain chunk

        // Traiter le chunk (transcription)
        try {
          const transcribed = await processChunk(chunkBlob, chunkNumber);
          setTranscribedText(transcribed);
        } catch (err) {
          console.error('Erreur lors du traitement du chunk:', err);
        }

        // FIX: Si on continue l'enregistrement, arrêter et redémarrer le MediaRecorder
        if (shouldContinueRef.current && streamRef.current) {
          // FIX: Créer un nouveau MediaRecorder pour le chunk suivant
          const nextOptions: MediaRecorderOptions = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000,
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

          // FIX: Réutiliser le même handler pour le prochain chunk
          nextRecorder.onstop = mediaRecorder.onstop;
          mediaRecorderRef.current = nextRecorder;
          
          // FIX: Redémarrer après un court délai
          setTimeout(() => {
            if (nextRecorder && nextRecorder.state === 'inactive' && streamRef.current && shouldContinueRef.current) {
              nextRecorder.start();
              startTimeRef.current = Date.now();
              setElapsedTime(0);
              console.log(`🎤 Chunk ${chunkNumber + 1} redémarré`);
            }
          }, 1000);
        } else {
          // FIX: Arrêt définitif
          setIsRecording(false);
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

      // Mettre à jour le temps écoulé toutes les secondes
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);

        // Vérifier si on a atteint la durée du chunk (arrêter automatiquement le chunk)
        if (elapsed >= CHUNK_DURATION_MS / 1000) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            startTimeRef.current = Date.now(); // Réinitialiser pour le prochain chunk
            setElapsedTime(0);
          }
        }
      }, 1000);

      console.log('🎤 Enregistrement démarré');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ Erreur démarrage enregistrement:', err);
    }
  }, [currentChunk, processChunk, requestMicrophonePermission]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    shouldContinueRef.current = false; // Ne plus continuer automatiquement
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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

    setIsRecording(false);
    console.log('🛑 Enregistrement arrêté');
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
  };
}
