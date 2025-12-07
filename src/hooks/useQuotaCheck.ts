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

    try {
      setLoading(true);
      setError(null);
      const result = await checkQuota(user.id, feature, increment);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du quota';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

