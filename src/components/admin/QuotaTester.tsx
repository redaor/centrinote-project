/**
 * 🧪 Composant de test pour les quotas utilisateur
 * Permet de simuler différents états de quota pour tester les limites
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../AuthProvider';
import { getUserQuotas, getUserPlan } from '../../services/quotaService';
import { supabase } from '../../lib/supabase';
import { Crown, RefreshCw, AlertCircle, CheckCircle, Zap, Users, FileText, Brain } from 'lucide-react';

interface QuotaTesterProps {
  testEmail?: string;
}

export function QuotaTester({ testEmail = 'redasahraoui1@gmail.com' }: QuotaTesterProps) {
  const { state } = useApp();
  const { darkMode } = state;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentQuotas, setCurrentQuotas] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Vérifier si l'utilisateur est autorisé (admin ou email de test)
  const isAuthorized = user?.email === testEmail || user?.email === 'reda_sahraoui@outlook.fr';

  useEffect(() => {
    if (isAuthorized) {
      loadCurrentState();
    }
  }, [isAuthorized, loadCurrentState]);

  const loadCurrentState = useCallback(async () => {
    try {
      setLoading(true);
      // Récupérer l'ID utilisateur via RPC ou directement depuis auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setMessage({ type: 'error', text: 'Utilisateur non connecté' });
        return;
      }
      
      // Pour l'email de test, utiliser l'ID de l'utilisateur connecté ou chercher par email
      let userId = authUser.id;
      
      // Si l'email de test est différent, chercher l'utilisateur
      if (authUser.email !== testEmail) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', testEmail)
          .single();
        
        if (profiles) {
          userId = profiles.id;
        } else {
          setMessage({ type: 'error', text: `Utilisateur ${testEmail} non trouvé` });
          return;
        }
      }

      if (!userId) {
        setMessage({ type: 'error', text: `ID utilisateur non trouvé` });
        return;
      }

      const [quotas, plan] = await Promise.all([
        getUserQuotas(userId),
        getUserPlan(userId)
      ]);

      setCurrentQuotas(quotas);
      setCurrentPlan(plan);
    } catch (error) {
      console.error('Erreur chargement état:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement' });
    } finally {
      setLoading(false);
    }
  }, [testEmail]);

  const applyTestScenario = async (scenario: 'free' | 'starter' | 'pro' | 'teams' | 'reset') => {
    if (!isAuthorized) {
      setMessage({ type: 'error', text: 'Non autorisé' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Appeler une fonction Edge pour exécuter le SQL
      const { data, error } = await supabase.functions.invoke('test-quotas', {
        body: {
          email: testEmail,
          scenario
        }
      });

      if (error) throw error;

      setMessage({ 
        type: 'success', 
        text: `Scénario ${scenario} appliqué avec succès !` 
      });

      // Recharger l'état
      await loadCurrentState();
    } catch (error) {
      console.error('Erreur application scénario:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur : ${error instanceof Error ? error.message : 'Inconnue'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Accès réservé pour les tests de quotas
        </p>
      </div>
    );
  }

  const getQuotaPercentage = (used: number, limit: number | 'unlimited' | null): number => {
    if (limit === 'unlimited' || limit === null) return 0;
    if (limit === 0) return 100;
    return Math.round((used / limit) * 100);
  };

  const getQuotaColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600 dark:text-red-400';
    if (percentage >= 90) return 'text-orange-600 dark:text-orange-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🧪 Testeur de Quotas
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
            Utilisateur test : {testEmail}
          </p>
        </div>
        <button
          onClick={loadCurrentState}
          disabled={loading}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            darkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          } disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
            : message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Plan actuel */}
      {currentPlan && (
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Plan actuel : {currentPlan.display_name || currentPlan.name}
            </span>
          </div>
        </div>
      )}

      {/* Scénarios de test */}
      <div className="mb-6">
        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Scénarios de test
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={() => applyTestScenario('reset')}
            disabled={loading}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } disabled:opacity-50`}
          >
            🔄 Réinitialiser
          </button>
          <button
            onClick={() => applyTestScenario('free')}
            disabled={loading}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50`}
          >
            🆓 Free (Limites atteintes)
          </button>
          <button
            onClick={() => applyTestScenario('starter')}
            disabled={loading}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-green-700 hover:bg-green-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:opacity-50`}
          >
            ⭐ Starter (66% utilisé)
          </button>
          <button
            onClick={() => applyTestScenario('pro')}
            disabled={loading}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-purple-700 hover:bg-purple-600 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            } disabled:opacity-50`}
          >
            💼 Pro (90% utilisé)
          </button>
          <button
            onClick={() => applyTestScenario('teams')}
            disabled={loading}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            } disabled:opacity-50`}
          >
            👥 Teams (Illimité)
          </button>
        </div>
      </div>

      {/* État actuel des quotas */}
      {currentQuotas.length > 0 && (
        <div>
          <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            État actuel des quotas
          </h3>
          <div className="space-y-3">
            {currentQuotas
              .filter(q => ['ai_tokens', 'meeting_count', 'summary_count', 'vocab_words'].includes(q.feature))
              .map((quota) => {
                const percentage = getQuotaPercentage(quota.usage, quota.limit);
                const colorClass = getQuotaColor(percentage);
                const isUnlimited = quota.limit === 'unlimited' || quota.limit === null;
                
                return (
                  <div
                    key={quota.feature}
                    className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {quota.feature === 'ai_tokens' && <Brain className="w-4 h-4" />}
                        {quota.feature === 'meeting_count' && <Users className="w-4 h-4" />}
                        {quota.feature === 'summary_count' && <FileText className="w-4 h-4" />}
                        {quota.feature === 'vocab_words' && <Zap className="w-4 h-4" />}
                        <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {quota.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {percentage >= 100 && <AlertCircle className="w-4 h-4 text-red-500" />}
                        {percentage >= 90 && percentage < 100 && <AlertCircle className="w-4 h-4 text-orange-500" />}
                        {percentage < 90 && <CheckCircle className="w-4 h-4 text-green-500" />}
                        <span className={`text-sm font-semibold ${colorClass}`}>
                          {isUnlimited ? '∞' : `${percentage}%`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {quota.usage.toLocaleString()} / {isUnlimited ? '∞' : quota.limit.toLocaleString()} {quota.unit}
                      </span>
                    </div>
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full transition-all ${
                          percentage >= 100 ? 'bg-red-500' :
                          percentage >= 90 ? 'bg-orange-500' :
                          percentage >= 80 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}

