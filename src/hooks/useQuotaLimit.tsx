/**
 * Hook pour gérer les limites de quota avec modals et redirections
 */

import { useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { checkQuota } from '../services/quotaService';
import { QuotaLimitModal } from '../components/quota/QuotaLimitModal';

export interface UseQuotaLimitResult {
  checkAndShowModal: (
    feature: 'meeting' | 'summary' | 'ai_tokens' | 'vocab' | 'automation' | 'ai_chat' | 'ai_help',
    increment?: number
  ) => Promise<boolean>; // Retourne true si autorisé, false si bloqué
  modal: React.ReactNode;
}

export function useQuotaLimit(): UseQuotaLimitResult {
  const { state } = useApp();
  const { user, darkMode } = state;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    feature: 'meeting' | 'summary' | 'ai_tokens' | 'vocab' | 'automation' | 'ai_chat' | 'ai_help';
    currentUsage: number;
    limit: number | 'unlimited' | null;
    planName: string;
  } | null>(null);

  const checkAndShowModal = useCallback(async (
    feature: 'meeting' | 'summary' | 'ai_tokens' | 'vocab' | 'automation' | 'ai_chat' | 'ai_help',
    increment: number = 1
  ): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    // 🔓 Les administrateurs ont accès illimité à toutes les fonctionnalités
    if (user.role === 'admin') {
      return true;
    }

    try {
      // Pour ai_chat et ai_help, vérifier le plan directement
      if (feature === 'ai_chat') {
        const { getUserPlan } = await import('../services/quotaService');
        const plan = await getUserPlan(user.id);
        
        // Seuls les plans Starter, Pro et Teams ont accès à l'IA Discussion
        if (plan?.name === 'free') {
          setModalData({
            feature: 'ai_chat',
            currentUsage: 0,
            limit: null,
            planName: plan.display_name || 'Free'
          });
          setIsModalOpen(true);
          return false;
        }
        return true;
      }

      if (feature === 'ai_help') {
        // Vérifier le quota spécifique pour l'aide IA (3 utilisations pour Free)
        // Utiliser 'ai_tokens' comme fallback si 'ai_help_count' n'existe pas encore
        try {
          const quotaCheck = await checkQuota(user.id, 'ai_help_count', increment);
          // ✅ FIX: Vérifier à la fois allowed ET percentage < 100 (car allowed peut être true même à 100%)
          const isAllowed = quotaCheck.allowed && quotaCheck.percentage < 100;

          if (!isAllowed) {
            setModalData({
              feature: 'ai_help',
              currentUsage: quotaCheck.usage,
              limit: quotaCheck.limit === 'unlimited' ? null : quotaCheck.limit,
              planName: quotaCheck.plan_display_name || 'Free'
            });
            setIsModalOpen(true);
            return false;
          }
          // ✅ FIX #3: Monitoring à 90%
          if (quotaCheck.percentage >= 90 && quotaCheck.limit !== 'unlimited' && quotaCheck.limit !== 'error') {
            console.warn(`⚠️ QUOTA ALERT: User ${user.id} at ${quotaCheck.percentage}% of ai_help_count limit`);
          }
          return true;
        } catch (error) {
          // Si 'ai_help_count' n'existe pas, utiliser 'ai_tokens' comme fallback
          // ✅ FIX #1: Marge de sécurité 1.5x sur l'estimation des tokens
          const safeIncrement = Math.ceil(increment * 1.5);
          const quotaCheck = await checkQuota(user.id, 'ai_tokens', safeIncrement);
          // ✅ FIX: Vérifier à la fois allowed ET percentage < 100
          const isAllowed = quotaCheck.allowed && quotaCheck.percentage < 100;

          if (!isAllowed) {
            setModalData({
              feature: 'ai_help',
              currentUsage: quotaCheck.usage,
              limit: quotaCheck.limit === 'unlimited' ? null : quotaCheck.limit,
              planName: quotaCheck.plan_display_name || 'Free'
            });
            setIsModalOpen(true);
            return false;
          }
          // ✅ FIX #3: Monitoring à 90%
          if (quotaCheck.percentage >= 90 && quotaCheck.limit !== 'unlimited' && quotaCheck.limit !== 'error') {
            console.warn(`⚠️ QUOTA ALERT: User ${user.id} at ${quotaCheck.percentage}% of ai_tokens limit`);
          }
          return true;
        }
      }

      // Pour les autres features, utiliser checkQuota normal
      // ✅ FIX #1: Marge de sécurité 1.5x pour ai_tokens uniquement
      let safeIncrement = increment;
      if (feature === 'ai_tokens') {
        safeIncrement = Math.ceil(increment * 1.5);
      }
      
      const quotaCheck = await checkQuota(user.id, feature, safeIncrement);
      // ✅ FIX: Vérifier à la fois allowed ET percentage < 100
      const isAllowed = quotaCheck.allowed && quotaCheck.percentage < 100;

      if (!isAllowed) {
        setModalData({
          feature,
          currentUsage: quotaCheck.usage,
          limit: quotaCheck.limit === 'unlimited' ? null : quotaCheck.limit,
          planName: quotaCheck.plan_display_name || 'Free'
        });
        setIsModalOpen(true);
        return false;
      }

      // ✅ FIX #3: Monitoring à 90%
      if (quotaCheck.percentage >= 90 && quotaCheck.limit !== 'unlimited' && quotaCheck.limit !== 'error') {
        console.warn(`⚠️ QUOTA ALERT: User ${user.id} at ${quotaCheck.percentage}% of ${feature} limit (${quotaCheck.usage}/${quotaCheck.limit})`);
      }

      return true;
    } catch (error) {
      console.error('Erreur vérification quota:', error);
      return false;
    }
  }, [user?.id, user?.role]);

  const modal = modalData ? (
    <QuotaLimitModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      feature={modalData.feature}
      currentUsage={modalData.currentUsage}
      limit={modalData.limit}
      planName={modalData.planName}
      darkMode={darkMode}
    />
  ) : null;

  return {
    checkAndShowModal,
    modal
  };
}

