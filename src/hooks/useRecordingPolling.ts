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
 * Hook pour poller le serveur toutes les 5s afin de récupérer l'URL
 * de téléchargement de l'enregistrement Daily.co
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

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxAttemptsRef = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60; // 60 * 5s = 5 minutes max

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

    // Fonction de polling
    const pollRecordingUrl = async () => {
      try {
        maxAttemptsRef.current++;
        console.log(`[POLLING] Tentative ${maxAttemptsRef.current}/${MAX_POLLING_ATTEMPTS}`);

        // Appeler la serverless function
        const response = await fetch(
          `/.netlify/functions/get-recording-url?roomName=${encodeURIComponent(roomName)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.downloadUrl) {
            console.log('[POLLING] ✅ Recording URL récupérée:', data.downloadUrl);
            console.log('[POLLING] Recording ID:', data.recordingId);
            console.log('[POLLING] Expires at:', data.expiresAtDate);

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
                console.error('[POLLING] Erreur mise à jour Supabase:', updateError);
              } else {
                console.log('[POLLING] ✅ Supabase mis à jour avec recording_url');

                // 🎤 Déclencher la transcription automatique
                console.log('[POLLING] 🎤 Lancement de la transcription automatique...');
                try {
                  const transcribeResponse = await fetch('/.netlify/functions/transcribe-audio', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      meetingId: meetingId,
                      audioUrl: data.downloadUrl,
                    }),
                  });

                  if (transcribeResponse.ok) {
                    const transcribeData = await transcribeResponse.json();
                    console.log('[POLLING] ✅ Transcription lancée:', transcribeData);
                  } else {
                    const errorData = await transcribeResponse.json();
                    console.error('[POLLING] ⚠️ Erreur transcription (non bloquant):', errorData);
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
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } else if (response.status === 404) {
          // Recording pas encore prêt - continuer à poller
          const data = await response.json();
          console.log('[POLLING] Recording pas prêt, retry dans 5s...', data.message);

          // Vérifier si on a atteint le max de tentatives
          if (maxAttemptsRef.current >= MAX_POLLING_ATTEMPTS) {
            console.error('[POLLING] ❌ Max tentatives atteint, arrêt du polling');
            setError('Le serveur met trop de temps à traiter l\'enregistrement. Réessayez plus tard.');
            setIsPolling(false);

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        } else {
          // Erreur serveur
          const errorData = await response.json();
          console.error('[POLLING] Erreur serveur:', errorData);
          setError(errorData.error || 'Erreur lors de la récupération de l\'enregistrement');
          setIsPolling(false);

          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (fetchError) {
        console.error('[POLLING] Erreur fetch:', fetchError);
        setError('Erreur réseau lors de la récupération de l\'enregistrement');
        setIsPolling(false);

        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    };

    // Premier appel immédiat
    pollRecordingUrl();

    // Ensuite toutes les 5 secondes
    pollingIntervalRef.current = setInterval(pollRecordingUrl, 5000);

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[POLLING] Arrêt du polling (cleanup)');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [roomName, meetingId, isRecordingStopped, enabled, downloadUrl]);

  return {
    downloadUrl,
    isPolling,
    error,
  };
}
