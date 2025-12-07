/**
 * Hook pour récupérer les limites du plan utilisateur
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { getUserPlan } from '../services/quotaService';

export interface PlanLimits {
  meeting_max_participants: number | null; // null = illimité
  meeting_max_duration_minutes: number | null;
  meeting_count_limit: number | null;
  meeting_minutes_limit: number | null;
  summary_count_limit: number | null;
  vocab_words_limit: number | null;
  vocab_collections_limit: number | null;
  ai_tokens_limit: number | null;
  automations_active_limit: number | null;
  plan_name: string;
  plan_display_name: string;
}

export function usePlanLimits() {
  const { state } = useApp();
  const { user } = state;
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLimits = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const plan = await getUserPlan(user.id);
      
      if (plan) {
        setLimits({
          meeting_max_participants: plan.meeting_max_participants ?? null,
          meeting_max_duration_minutes: plan.meeting_max_duration_minutes ?? null,
          meeting_count_limit: plan.meeting_count_limit ?? null,
          meeting_minutes_limit: plan.meeting_minutes_limit ?? null,
          summary_count_limit: plan.summary_count_limit ?? null,
          vocab_words_limit: plan.vocab_words_limit ?? null,
          vocab_collections_limit: plan.vocab_collections_limit ?? null,
          ai_tokens_limit: plan.ai_tokens_limit ?? null,
          automations_active_limit: plan.automations_active_limit ?? null,
          plan_name: plan.name || 'free',
          plan_display_name: plan.display_name || 'Free'
        });
      }
    } catch (err) {
      console.error('❌ Erreur chargement limites plan:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  return {
    limits,
    loading,
    error,
    refetch: loadLimits
  };
}

