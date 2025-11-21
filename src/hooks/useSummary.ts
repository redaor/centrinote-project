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

      // Récupérer directement depuis Supabase (table meetings)
      const { data: meeting, error: dbError } = await supabase
        .from('meetings')
        .select('id, title, transcript, ai_summary, started_at, ended_at, participants, validated_by, validated_at')
        .eq('id', meetingId)
        .single();

      if (dbError) {
        console.error('❌ [USE-SUMMARY] Erreur Supabase:', dbError);
        throw new Error('Erreur chargement résumé');
      }

      if (!meeting) {
        setSummary(null);
        setLoading(false);
        return;
      }

      // Vérifier si le résumé IA existe
      if (!meeting.ai_summary || !meeting.transcript) {
        // Pas encore de résumé, c'est normal
        setSummary(null);
        setLoading(false);
        return;
      }

      // Parser les données JSONB de Supabase
      const aiSummary = typeof meeting.ai_summary === 'string'
        ? JSON.parse(meeting.ai_summary)
        : meeting.ai_summary;

      const transcript = typeof meeting.transcript === 'string'
        ? JSON.parse(meeting.transcript)
        : meeting.transcript;

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
          title: aiSummary?.summary || '',
          key_points: aiSummary?.key_points || [],
          decisions: aiSummary?.decisions?.map((d: string) => ({
            what: d,
            who: undefined,
            deadline: undefined,
          })) || [],
          actions: aiSummary?.action_items?.map((item: { task: string; assignee?: string }) => ({
            task: item.task,
            owner: item.assignee,
            due: undefined,
          })) || [],
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

      // Vérifier directement dans Supabase
      const { data } = await supabase
        .from('meetings')
        .select('id, title, ai_summary, transcript, started_at, ended_at, participants, validated_by, validated_at')
        .eq('id', meetingId)
        .single();

      if (data?.ai_summary && data?.transcript) {
        console.log('✅ [USE-SUMMARY] Résumé trouvé, arrêt du polling');
        hasStoppedPolling = true;
        if (intervalId) clearInterval(intervalId);

        // Mettre à jour via fetchSummary pour formater et mettre en cache
        await fetchSummary();
        return;
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

