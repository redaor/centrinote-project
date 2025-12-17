import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Crown, TrendingUp, Zap } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { getUserQuotas, getUserPlan, getPlanPrice, getPromoPercentage, getPromoDaysRemaining } from '../../services/quotaService';

interface QuotaData {
  feature: string;
  displayName: string;
  unit: string;
  usage: number;
  limit: number | 'unlimited';
  percentage: number;
  plan_name?: string;
  plan_display_name?: string;
}

export function QuotaBar() {
  const { state } = useApp();
  const { user, darkMode } = state;
  const [quotas, setQuotas] = useState<QuotaData[]>([]);
  const [userPlan, setUserPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [quotasData, planData] = await Promise.all([
        getUserQuotas(user.id),
        getUserPlan(user.id)
      ]);

      setQuotas(quotasData);
      setUserPlan(planData);

      // Détecter si besoin d'afficher modal upgrade (≥90%)
      const critical = quotasData.some(
        (q: QuotaData) => q.limit !== 'unlimited' && q.percentage >= 90
      );
      if (critical) setShowUpgradeModal(true);
    } catch (error) {
      console.error('❌ Erreur chargement quotas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id, loadData]);

  const getColorClass = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColorClass = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 80) return 'text-orange-600 dark:text-orange-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const formatNumber = (num: number | 'unlimited', unit?: string): string => {
    if (num === 'unlimited') return '∞';
    if (unit === 'tokens' && typeof num === 'number') {
      return `${Math.round(num / 1000)}k`;
    }
    return num.toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} animate-pulse`}>
        <div className="h-6 bg-gray-300 rounded mb-3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const currentPrice = userPlan ? getPlanPrice(userPlan) : 0;
  const promoPercentage = userPlan ? getPromoPercentage(userPlan) : null;
  const promoDays = userPlan ? getPromoDaysRemaining(userPlan) : null;

  // Filtrer pour afficher seulement les quotas les plus importants
  const displayedQuotas = quotas.filter(q =>
    ['ai_tokens', 'meeting_count', 'summary_count', 'vocab_words'].includes(q.feature)
  );

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {userPlan?.display_name || 'Free'}
          </h3>
          {currentPrice > 0 && (
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentPrice} €/mois
              {promoPercentage && (
                <span className="ml-2 text-orange-600 font-semibold">
                  -{promoPercentage}% 🔥
                </span>
              )}
            </p>
          )}
          {promoDays && promoDays > 0 && (
            <p className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} mt-1`}>
              Promo : {promoDays} jour{promoDays > 1 ? 's' : ''} restant{promoDays > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {userPlan?.name !== 'teams' && userPlan?.name !== 'pro' && (
          <button
            onClick={() => window.location.href = '/launch'}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors ${
              darkMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            Upgrade
          </button>
        )}
      </div>

      {/* Quotas list */}
      <div className="space-y-3">
        {displayedQuotas.map((quota) => (
          <div key={quota.feature}>
            <div className="flex justify-between text-xs mb-1">
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                {quota.displayName}
              </span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {formatNumber(quota.usage, quota.unit)} / {formatNumber(quota.limit, quota.unit)}
              </span>
            </div>
            <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className={`h-full transition-all duration-300 ${getColorClass(quota.percentage)}`}
                style={{ width: `${Math.min(quota.percentage, 100)}%` }}
              />
            </div>
            {quota.percentage >= 80 && quota.limit !== 'unlimited' && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getTextColorClass(quota.percentage)}`}>
                <AlertTriangle className="w-3 h-3" />
                {quota.percentage >= 100
                  ? 'Quota dépassé'
                  : quota.percentage >= 90
                  ? `Plus que ${100 - Math.floor(quota.percentage)}% disponible`
                  : 'Attention : bientôt atteint'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Promo banner si applicable */}
      {promoDays && promoDays > 0 && promoDays <= 7 && (
        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-xs font-medium ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                Promo de lancement
              </p>
              <p className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-700'} mt-0.5`}>
                Plus que {promoDays} jour{promoDays > 1 ? 's' : ''} pour profiter de -{promoPercentage}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`p-6 rounded-xl max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-2xl`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🚀 Passez au niveau supérieur
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Vous approchez de vos limites. Débloquez plus de fonctionnalités avec un plan supérieur !
              </p>
              {promoDays && promoDays > 0 && (
                <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
                  <p className="text-sm font-semibold text-orange-600">
                    🔥 Promo : encore {promoDays} jour{promoDays > 1 ? 's' : ''} pour économiser {promoPercentage}%
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Plus tard
              </button>
              <button
                onClick={() => window.location.href = '/launch'}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                Voir les offres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
