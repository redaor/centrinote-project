/**
 * Hook pour vérifier et gérer les quotas utilisateur
 */

import { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { checkQuota, incrementQuota, QuotaCheckResult } from '../services/quotaService';

export interface UseQuotaCheckResult {
  check: (feature: string, increment?: number) => Promise<QuotaCheckResult>;
  increment: (feature: string, amount?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useQuotaCheck(): UseQuotaCheckResult {
  const { state } = useApp();
  const { user } = state;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (
    feature: string,
    increment: number = 1
  ): Promise<QuotaCheckResult> => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    // 🔓 Les administrateurs ont accès illimité à toutes les fonctionnalités
    if (user.role === 'admin') {
      return {
        allowed: true,
        usage: 0,
        limit: 'unlimited',
        percentage: 0,
        plan_name: 'admin',
        plan_display_name: 'Administrateur'
      };
    }

    try {
      setLoading(true);
      setError(null);
      
      // ✅ FIX #1: Marge de sécurité 1.5x pour ai_tokens uniquement
      let safeIncrement = increment;
      if (feature === 'ai_tokens') {
        safeIncrement = Math.ceil(increment * 1.5);
      }
      
      const result = await checkQuota(user.id, feature, safeIncrement);
      
      // ✅ FIX #3: Monitoring à 90% - alerte console
      if (result.percentage >= 90 && result.limit !== 'unlimited' && result.limit !== 'error') {
        console.warn(`⚠️ QUOTA ALERT: User ${user.id} at ${result.percentage}% of ${feature} limit (${result.usage}/${result.limit})`);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du quota';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const increment = useCallback(async (
    feature: string,
    amount: number = 1
  ): Promise<void> => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      setLoading(true);
      setError(null);
      await incrementQuota(user.id, feature, amount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'incrémentation du quota';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    check,
    increment,
    loading,
    error
  };
}

