import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface RecordingPollingResult {
  downloadUrl: string | null;
  isPolling: boolean;
  error: string | null;
}

interface UseRecordingPollingOptions {
  roomName: string | null;
  meetingId: string | null;
  isRecordingStopped: boolean; // Trigger quand l'enregistrement s'arrête
  enabled?: boolean;
}

/**
 * Hook pour poller le serveur avec backoff exponentiel (2s → 5s → 10s → 15s)
 * afin de récupérer l'URL de téléchargement de l'enregistrement Daily.co
 */
export function useRecordingPolling({
  roomName,
  meetingId,
  isRecordingStopped,
  enabled = true,
}: UseRecordingPollingOptions): RecordingPollingResult {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxAttemptsRef = useRef(0);
  const MAX_POLLING_ATTEMPTS = 40; // ~4-5 minutes avec backoff

  // 🚀 OPTIMISATION: Backoff exponentiel pour réduire la charge
  const getPollingDelay = (attemptNumber: number): number => {
    if (attemptNumber <= 3) return 2000;   // 0-6s: toutes les 2s (rapide au début)
    if (attemptNumber <= 10) return 5000;  // 6-50s: toutes les 5s
    if (attemptNumber <= 20) return 10000; // 50-150s: toutes les 10s
    return 15000;                          // 150s+: toutes les 15s (lent)
  };

  useEffect(() => {
    // Ne pas démarrer le polling si désactivé ou si on n'a pas les infos nécessaires
    if (!enabled || !roomName || !meetingId || !isRecordingStopped) {
      return;
    }

    // Si on a déjà l'URL, ne pas poller
    if (downloadUrl) {
      return;
    }

    console.log('[POLLING] Démarrage polling recording URL pour:', roomName);
    setIsPolling(true);
    setError(null);
    maxAttemptsRef.current = 0;

    // Fonction de polling avec backoff exponentiel
    const pollRecordingUrl = async () => {
      try {
        maxAttemptsRef.current++;
        if (import.meta.env.DEV) {
          console.log(`[POLLING] Tentative ${maxAttemptsRef.current}/${MAX_POLLING_ATTEMPTS}`);
        }

        // Appeler la Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('get-recording-url', {
          body: { roomName }
        });

        if (!error && data?.success && data.downloadUrl) {
          if (import.meta.env.DEV) {
            console.log('[POLLING] ✅ Recording URL récupérée:', data.downloadUrl);
          }

          setDownloadUrl(data.downloadUrl);
          setIsPolling(false);

          // Mettre à jour Supabase avec l'URL
          try {
            const { error: updateError } = await supabase
              .from('meetings')
              .update({
                recording_url: data.downloadUrl,
                recording_id: data.recordingId,
                recording_ready_at: new Date().toISOString(),
              })
              .eq('id', meetingId);

            if (updateError) {
              if (import.meta.env.DEV) {
                console.error('[POLLING] Erreur mise à jour Supabase:', updateError);
              }
            } else {
              if (import.meta.env.DEV) {
                console.log('[POLLING] ✅ Supabase mis à jour avec recording_url');
              }

              // 🎤 Déclencher la transcription automatique via Supabase Edge Function
              console.log('[POLLING] 🎤 Lancement de la transcription automatique...');
              try {
                const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
                  body: {
                    meetingId: meetingId,
                    audioUrl: data.downloadUrl,
                  }
                });

                if (!transcribeError && transcribeData?.success) {
                  console.log('[POLLING] ✅ Transcription lancée:', transcribeData);
                } else {
                  console.error('[POLLING] ⚠️ Erreur transcription (non bloquant):', transcribeError || transcribeData);
                }
              } catch (transcribeError) {
                // Ignorer les erreurs de navigation (Failed to fetch est normal si la page se démonte)
                if (transcribeError instanceof TypeError && transcribeError.message?.includes('Failed to fetch')) {
                  console.log('[POLLING] ℹ️ Transcription annulée par navigation (normal, webhook Daily.co s\'en chargera)');
                } else {
                  console.error('[POLLING] ⚠️ Erreur appel transcription (non bloquant):', transcribeError);
                }
              }
            }
          } catch (dbError) {
            console.error('[POLLING] Erreur DB:', dbError);
          }

          // Arrêter le polling
          return; // Succès, pas de retry
        } else if (error || (data && !data.success && data.error?.includes('No finished recording found'))) {
          // Recording pas encore prêt - continuer à poller avec backoff
          if (import.meta.env.DEV) {
            console.log('[POLLING] Recording pas prêt, retry...', error?.message || data?.error);
          }

          // Vérifier si on a atteint le max de tentatives
          if (maxAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
            if (import.meta.env.DEV) {
              console.error('[POLLING] ❌ Max tentatives atteint, arrêt du polling');
            }
            setError('Le serveur met trop de temps à traiter l\'enregistrement. Réessayez plus tard.');
            setIsPolling(false);
            return;
          }

          // 🚀 Schedule prochain poll avec backoff exponentiel
          const nextDelay = getPollingDelay(maxAttemptsRef.current);
          pollingTimeoutRef.current = setTimeout(pollRecordingUrl, nextDelay);
        } else {
          // Erreur serveur
          if (import.meta.env.DEV) {
            console.error('[POLLING] Erreur serveur:', error || data);
          }
          setError(error?.message || data?.error || 'Erreur lors de la récupération de l\'enregistrement');
          setIsPolling(false);
        }
      } catch (fetchError) {
        if (import.meta.env.DEV) {
          console.error('[POLLING] Erreur fetch:', fetchError);
        }
        setError('Erreur réseau lors de la récupération de l\'enregistrement');
        setIsPolling(false);
      }
    };

    // Premier appel immédiat
    pollRecordingUrl();

    // Cleanup
    return () => {
      if (pollingTimeoutRef.current) {
        if (import.meta.env.DEV) {
          console.log('[POLLING] Arrêt du polling (cleanup)');
        }
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [roomName, meetingId, isRecordingStopped, enabled, downloadUrl]);

  return {
    downloadUrl,
    isPolling,
    error,
  };
}
