/**
 * Hook pour enregistrement audio long (cours)
 * - Enregistrement par chunks de 30 min
 * - Transcription via OpenAI API
 * - Format webm mono 48 kHz
 */

import { useState, useRef, useCallback } from 'react';

interface UseLongRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  currentChunk: number;
  elapsedTime: number; // en secondes
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcribedText: string | null;
  error: string | null;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const shouldContinueRef = useRef<boolean>(false); // Ref pour suivre si on doit continuer après un chunk

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

  // Transcrire audio via Edge Function Supabase (utilise OPENAI_API_KEY depuis Supabase)
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    // Récupérer la session Supabase pour l'authentification
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Vous devez être connecté pour transcrire l\'audio');
    }

    // Convertir Blob en File pour FormData
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioFile);

    // Appeler l'Edge Function Supabase
    const response = await fetch(`${supabaseUrl}/functions/v1/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(errorData.error || `Erreur API: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  }, []);

  // Traiter un chunk (transcription)
  const processChunk = useCallback(async (audioBlob: Blob, chunkNumber: number): Promise<string> => {
    setIsTranscribing(true);
    setError(null);

    try {
      console.log(`🎤 Transcription du chunk ${chunkNumber}...`);
      const text = await transcribeAudio(audioBlob);
      console.log(`✅ Chunk ${chunkNumber} transcrit:`, text.slice(0, 100) + '...');
      return text;
    } catch (err) {
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

      // Demander permission micro
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;

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

      // Gérer la fin d'un chunk (30 min)
      const handleChunkStop = async (chunkBlob: Blob, chunkNumber: number) => {
        try {
          // Transcrire le chunk
          const transcribed = await processChunk(chunkBlob, chunkNumber);
          setTranscribedText(transcribed);

          // Si on continue l'enregistrement, redémarrer pour le chunk suivant
          if (shouldContinueRef.current && streamRef.current) {
            // Créer un nouveau MediaRecorder pour le chunk suivant
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

            // Réutiliser le même handler pour le prochain chunk
            nextRecorder.onstop = mediaRecorder.onstop;
            mediaRecorderRef.current = nextRecorder;
            
            // Redémarrer après un court délai
            setTimeout(() => {
              if (nextRecorder && nextRecorder.state === 'inactive' && streamRef.current && shouldContinueRef.current) {
                nextRecorder.start();
                startTimeRef.current = Date.now();
                setElapsedTime(0);
                console.log(`🎤 Chunk ${chunkNumber + 1} démarré`);
              }
            }, 1000);
          }
        } catch (err) {
          console.error('Erreur lors du traitement du chunk:', err);
        }
      };

      mediaRecorder.onstop = async () => {
        if (chunks.length === 0) return;

        const chunkBlob = new Blob(chunks, { type: 'audio/webm' });
        const chunkNumber = currentChunk + 1;
        setCurrentChunk(chunkNumber);
        chunks.length = 0; // Réinitialiser pour le prochain chunk

        // Traiter le chunk (transcription)
        await handleChunkStop(chunkBlob, chunkNumber);

        // Si on continue l'enregistrement, redémarrer pour le chunk suivant
        if (shouldContinueRef.current && streamRef.current) {
          // Créer un nouveau MediaRecorder pour le chunk suivant
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

          // Réutiliser le même handler pour le prochain chunk
          nextRecorder.onstop = mediaRecorder.onstop;
          mediaRecorderRef.current = nextRecorder;
          
          // Redémarrer après un court délai
          setTimeout(() => {
            if (nextRecorder && nextRecorder.state === 'inactive' && streamRef.current && isRecording) {
              nextRecorder.start();
              startTimeRef.current = Date.now();
              setElapsedTime(0);
              console.log(`🎤 Chunk ${chunkNumber + 1} démarré`);
            }
          }, 1000);
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

        // Vérifier si on a atteint 30 min (arrêter automatiquement le chunk)
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
  }, [currentChunk, isRecording, processChunk, requestMicrophonePermission]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    shouldContinueRef.current = false; // Ne plus continuer automatiquement
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
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
  };
}

