// 📊 Hook pour récupérer et suivre les résumés de réunion
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  meeting_title?: string;
  meeting_started_at?: string;
  meeting_participants?: Array<{
    id: string;
    name: string;
    email: string;
    role?: 'organizer' | 'guest';
  }>;
  raw_transcript?: string;
  summary?: {
    title?: string;
    key_points?: string[];
    decisions?: Array<{
      what: string;
      who?: string;
      deadline?: string;
    }>;
    actions?: Array<{
      task: string;
      owner?: string;
      due?: string;
    }>;
  };
  markdown?: string;
  pdf_url?: string;
  generated_at?: string;
  validated_by?: string;
  validated_at?: string;
}

interface UseSummaryReturn {
  summary: MeetingSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  validateSummary: (userId: string) => Promise<boolean>;
}

// 💾 Cache en mémoire pour éviter les re-fetches inutiles (persiste pendant la session)
const summaryCache = new Map<string, MeetingSummary>();

/**
 * Hook pour récupérer le résumé d'une réunion avec polling automatique
 * ✅ Utilise un cache en mémoire pour éviter le polling inutile après navigation
 */
export function useSummary(meetingId: string | null, options?: {
  enabled?: boolean;
  refetchInterval?: number;
}): UseSummaryReturn {
  const enabled = options?.enabled !== false;
  const refetchInterval = options?.refetchInterval ?? 5000; // 5s par défaut

  // ✅ Initialiser avec le cache si disponible
  const [summary, setSummary] = useState<MeetingSummary | null>(() => {
    if (!meetingId) return null;
    const cached = summaryCache.get(meetingId);
    if (cached) {
      console.log('💾 [USE-SUMMARY] Résumé trouvé dans le cache pour:', meetingId);
    }
    return cached || null;
  });

  const [loading, setLoading] = useState(() => {
    // Si on a déjà un résumé en cache, pas besoin de loader
    return meetingId ? !summaryCache.has(meetingId) : true;
  });

  const [error, setError] = useState<string | null>(null);

  // Ref pour éviter les doubles-fetches
  const isFetchingRef = useRef(false);

  const fetchSummary = useCallback(async () => {
    if (!meetingId || !enabled) {
      setLoading(false);
      return;
    }

    // ✅ Si déjà en train de fetch, ne pas refaire
    if (isFetchingRef.current) {
      console.log('⏭️ [USE-SUMMARY] Fetch déjà en cours, skip');
      return;
    }

    // ✅ Vérifier le cache d'abord
    const cached = summaryCache.get(meetingId);
    if (cached) {
      console.log('💾 [USE-SUMMARY] Utilisation du cache');
      setSummary(cached);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;

    try {
      setError(null);

      // Récupérer directement depuis Supabase (table meetings) avec timeout
      const fetchPromise = supabase
        .from('meetings')
        .select('id, title, transcript, ai_summary, started_at, ended_at, participants, validated_by, validated_at')
        .eq('id', meetingId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000)
      );

      const { data: meeting, error: dbError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]).catch((err) => {
        if (err instanceof Error && err.message?.includes('Timeout')) {
          return { data: null, error: { message: 'Timeout' } };
        }
        throw err;
      }) as any;

      if (dbError) {
        // Ignorer les erreurs réseau et timeout
        if (dbError instanceof TypeError || dbError.message?.includes('Failed to fetch')) {
          console.warn('⚠️ [USE-SUMMARY] Erreur réseau (ignorée)');
          setSummary(null);
          setLoading(false);
          return;
        }
        if (dbError.message?.includes('Timeout')) {
          console.warn('⚠️ [USE-SUMMARY] Timeout (ignoré)');
          setSummary(null);
          setLoading(false);
          return;
        }
        console.error('❌ [USE-SUMMARY] Erreur Supabase:', dbError);
        throw new Error('Erreur chargement résumé');
      }

      if (!meeting) {
        setSummary(null);
        setLoading(false);
        return;
      }

      // Vérifier si le résumé IA existe (transcript optionnel)
      if (!meeting.ai_summary) {
        // Pas encore de résumé, c'est normal
        console.log('⏳ [USE-SUMMARY] Pas encore de résumé pour:', meetingId);
        setSummary(null);
        setLoading(false);
        return;
      }

      // Parser les données JSONB de Supabase
      let aiSummary;
      try {
        aiSummary = typeof meeting.ai_summary === 'string'
          ? JSON.parse(meeting.ai_summary)
          : meeting.ai_summary;
      } catch (parseError) {
        console.error('❌ [USE-SUMMARY] Erreur parsing ai_summary:', parseError);
        setError('Erreur format résumé');
        setLoading(false);
        return;
      }

      // Transcript est optionnel
      let transcript = null;
      if (meeting.transcript) {
        try {
          transcript = typeof meeting.transcript === 'string'
            ? JSON.parse(meeting.transcript)
            : meeting.transcript;
        } catch (parseError) {
          console.warn('⚠️ [USE-SUMMARY] Erreur parsing transcript (ignoré):', parseError);
          // Continuer sans transcript
        }
      }

      // Adapter au format attendu par le composant
      const formattedSummary: MeetingSummary = {
        id: meeting.id,
        meeting_id: meeting.id,
        meeting_title: meeting.title,
        meeting_started_at: meeting.started_at,
        meeting_participants: typeof meeting.participants === 'string'
          ? JSON.parse(meeting.participants)
          : meeting.participants,
        raw_transcript: transcript?.text || '',
        summary: {
          // ✅ Support de différents formats de résumé
          title: aiSummary?.summary || aiSummary?.title || aiSummary?.overview || '',
          key_points: aiSummary?.key_points || aiSummary?.points || aiSummary?.highlights || [],
          decisions: (aiSummary?.decisions || []).map((d: any) => {
            if (typeof d === 'string') {
              return { what: d, who: undefined, deadline: undefined };
            }
            return {
              what: d.what || d.decision || d,
              who: d.who || d.assignee,
              deadline: d.deadline || d.due
            };
          }),
          actions: (aiSummary?.action_items || aiSummary?.actions || []).map((item: any) => {
            if (typeof item === 'string') {
              return { task: item, owner: undefined, due: undefined };
            }
            return {
              task: item.task || item.action || item,
              owner: item.owner || item.assignee || item.who,
              due: item.due || item.deadline
            };
          }),
        },
        generated_at: transcript?.transcribed_at || meeting.ended_at,
        validated_by: meeting.validated_by,
        validated_at: meeting.validated_at,
      };

      // ✅ Mettre en cache
      summaryCache.set(meetingId, formattedSummary);
      console.log('💾 [USE-SUMMARY] Résumé mis en cache pour:', meetingId);

      setSummary(formattedSummary);
      setLoading(false);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur chargement résumé';
      setError(errorMsg);
      setLoading(false);
      console.error('❌ [USE-SUMMARY] Erreur:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [meetingId, enabled]);

  // Polling automatique jusqu'à ce que le résumé soit généré (max 10 minutes)
  useEffect(() => {
    if (!meetingId || !enabled) {
      setLoading(false);
      return;
    }

    // ✅ Vérifier le cache en premier
    const cached = summaryCache.get(meetingId);
    if (cached) {
      console.log('💾 [USE-SUMMARY] Cache hit, pas de polling nécessaire');
      setSummary(cached);
      setLoading(false);
      return;
    }

    console.log('🔄 [USE-SUMMARY] Pas de cache, démarrage du polling pour:', meetingId);

    let intervalId: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes
    let hasStoppedPolling = false;

    const poll = async () => {
      if (hasStoppedPolling) return;

      attempts++;

      try {
        // Vérifier directement dans Supabase avec timeout
        const pollPromise = supabase
          .from('meetings')
          .select('id, title, ai_summary, transcript, started_at, ended_at, participants, validated_by, validated_at')
          .eq('id', meetingId)
          .single();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );

        const { data, error: pollError } = await Promise.race([
          pollPromise,
          timeoutPromise
        ]).catch((err) => {
          if (err instanceof Error && err.message?.includes('Timeout')) {
            return { data: null, error: { message: 'Timeout' } };
          }
          throw err;
        }) as any;

        if (pollError) {
          // Ignorer les erreurs réseau et timeout silencieusement
          if (pollError instanceof TypeError || pollError.message?.includes('Failed to fetch')) {
            return; // Continuer le polling
          }
          if (pollError.message?.includes('Timeout')) {
            return; // Continuer le polling
          }
          console.warn('⚠️ [USE-SUMMARY] Erreur polling (ignorée):', pollError.message);
          return;
        }

        // ✅ Accepter le résumé même si le transcript n'est pas encore disponible
        // Vérifier si ai_summary existe et n'est pas vide/null
        const hasValidSummary = data?.ai_summary && 
          (typeof data.ai_summary === 'string' ? data.ai_summary.trim() !== '' : 
           typeof data.ai_summary === 'object' ? Object.keys(data.ai_summary).length > 0 : false);

        if (hasValidSummary) {
          console.log('✅ [USE-SUMMARY] Résumé trouvé, arrêt du polling', {
            hasAiSummary: !!data.ai_summary,
            aiSummaryType: typeof data.ai_summary,
            hasTranscript: !!data.transcript,
            meetingId,
            attempts
          });
          hasStoppedPolling = true;
          if (intervalId) clearInterval(intervalId);

          // Mettre à jour via fetchSummary pour formater et mettre en cache
          await fetchSummary();
          return;
        }

        // Log de debug pour comprendre pourquoi le résumé n'est pas trouvé
        if (attempts === 1 || attempts % 10 === 0) {
          console.log(`🔍 [USE-SUMMARY] Polling tentative ${attempts}/${maxAttempts}`, {
            meetingId,
            hasData: !!data,
            hasAiSummary: !!data?.ai_summary,
            hasTranscript: !!data?.transcript,
            aiSummaryType: data?.ai_summary ? typeof data.ai_summary : 'null',
            aiSummaryValue: data?.ai_summary ? (typeof data.ai_summary === 'string' ? data.ai_summary.substring(0, 50) : JSON.stringify(data.ai_summary).substring(0, 50)) : 'null'
          });
        }
      } catch (err) {
        // Ignorer les erreurs réseau et timeout
        if (err instanceof TypeError || (err instanceof Error && err.message?.includes('Failed to fetch'))) {
          return; // Continuer le polling
        }
        if (err instanceof Error && err.message?.includes('Timeout')) {
          return; // Continuer le polling
        }
        console.warn('⚠️ [USE-SUMMARY] Erreur polling (ignorée):', err);
      }

      if (attempts >= maxAttempts) {
        console.warn('⏱️ [USE-SUMMARY] Polling timeout après 10 minutes');
        hasStoppedPolling = true;
        if (intervalId) clearInterval(intervalId);
        setError('La génération du résumé prend plus de temps que prévu.');
        setLoading(false);
        return;
      }

      if (attempts === 1) {
        console.log('🔄 [USE-SUMMARY] Premier check - pas de résumé, démarrage intervalle');
      } else if (attempts % 10 === 0) {
        console.log(`🔄 [USE-SUMMARY] Polling tentative ${attempts}/${maxAttempts}`);
      }
    };

    // Premier check immédiat
    poll().then(() => {
      if (!hasStoppedPolling) {
        // Démarrer le polling seulement si pas encore de résumé
        intervalId = setInterval(poll, refetchInterval);
      }
    });

    return () => {
      console.log('🛑 [USE-SUMMARY] Cleanup polling');
      hasStoppedPolling = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [meetingId, enabled, refetchInterval, fetchSummary]);

  // Fonction pour valider le résumé
  const validateSummary = useCallback(async (userId: string): Promise<boolean> => {
    if (!meetingId) {
      console.error('❌ [USE-SUMMARY] Pas de meetingId pour validation');
      return false;
    }

    try {
      console.log('✅ [USE-SUMMARY] Validation du résumé pour:', meetingId);

      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          validated_by: userId,
          validated_at: new Date().toISOString(),
        })
        .eq('id', meetingId);

      if (updateError) {
        console.error('❌ [USE-SUMMARY] Erreur validation:', updateError);
        return false;
      }

      // Mettre à jour le cache et l'état local
      if (summary) {
        const updatedSummary: MeetingSummary = {
          ...summary,
          validated_by: userId,
          validated_at: new Date().toISOString(),
        };
        summaryCache.set(meetingId, updatedSummary);
        setSummary(updatedSummary);
      }

      console.log('✅ [USE-SUMMARY] Résumé validé avec succès');
      return true;

    } catch (err) {
      console.error('❌ [USE-SUMMARY] Erreur lors de la validation:', err);
      return false;
    }
  }, [meetingId, summary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
    validateSummary,
  };
}

