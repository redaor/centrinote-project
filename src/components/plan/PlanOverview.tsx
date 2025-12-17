/**
 * 📋 Composant PlanOverview - Affichage du plan actuel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { SubscriptionData } from '../../services/subscriptionService';
import { loadSubscription, createCustomerPortalSession } from '../../services/subscriptionServiceFallback';
import { Button } from '../ui/Button';
import { useApp } from '../../contexts/AppContext';

interface PlanOverviewProps {
  userId: string;
  onUpgrade?: () => void;
}

export function PlanOverview({ userId, onUpgrade }: PlanOverviewProps) {
  const { state } = useApp();
  const { user } = state;
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserSubscription();
  },[userId, loadUserSubscription]);

  const loadUserSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await loadSubscription(userId);
      
      if (result.ok) {
        setSubscription(result.data || null);
      } else {
        setError(result.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleManageBilling = async () => {
    try {
      const result = await createCustomerPortalSession(window.location.href);
      
      if (result.ok && result.data) {
        window.location.href = result.data;
      } else {
        setError(result.error || 'Impossible d\'ouvrir le portail de gestion');
      }
    } catch (err) {
      setError('Erreur lors de l\'ouverture du portail');
    }
  };

  const getPlanName = (priceId: string) => {
    switch (priceId) {
      case 'free': return 'Plan Free';
      case 'pro': return 'Plan Pro';
      case 'business': return 'Plan Business';
      default: return 'Plan Free';
    }
  };

  const getPlanStatus = (status: string) => {
    switch (status) {
      case 'active': return { text: 'Actif', color: 'text-green-600', icon: CheckCircle };
      case 'trialing': return { text: 'Essai', color: 'text-blue-600', icon: Calendar };
      case 'canceled': return { text: 'Annulé', color: 'text-red-600', icon: AlertCircle };
      default: return { text: 'Inconnu', color: 'text-gray-600', icon: AlertCircle };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // 🔓 Afficher "Plan Admin" pour les administrateurs
  const currentPlan = user?.role === 'admin' 
    ? 'Plan Admin' 
    : (subscription ? getPlanName(subscription.price_id) : 'Plan Free');
  const statusInfo = subscription ? getPlanStatus(subscription.status) : { text: 'Actif', color: 'text-green-600', icon: CheckCircle };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Plan actuel
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Plan Info */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {currentPlan}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
              <span className={`text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Details */}
        {subscription && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Période actuelle</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
              </span>
            </div>
            
            {subscription.payment_method_brand && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Méthode de paiement</span>
                <span className="text-gray-900 dark:text-white">
                  {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                </span>
              </div>
            )}

            {subscription.cancel_at_period_end && (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span>Annulation programmée à la fin de la période</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onUpgrade && (
            <Button
              onClick={onUpgrade}
              className="flex-1"
            >
              Changer de plan
            </Button>
          )}
          
          {subscription && (
            <Button
              variant="secondary"
              onClick={handleManageBilling}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Gérer ma facturation
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          Annulation possible à tout moment • Aucun engagement
        </div>
      </div>
    </div>
  );
}
