/**
 * 💳 Composant PlanSection - Section facturation et gestion
 */

import React, { useState } from 'react';
import { CreditCard, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { createCustomerPortalSession } from '../../services/subscriptionServiceFallback';
import { Button } from '../ui/Button';

interface PlanSectionProps {
  userId?: string;
  className?: string;
}

export function PlanSection({ userId, className = '' }: PlanSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await createCustomerPortalSession(window.location.href);
      
      if (result.ok && result.data) {
        window.location.href = result.data;
      } else {
        setError(result.error || 'Impossible d\'ouvrir le portail de gestion');
      }
    } catch (err) {
      setError('Erreur lors de l\'ouverture du portail');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoices = async () => {
    // Pour l'instant, redirige vers le portail client
    // Plus tard, on pourra créer une page dédiée aux factures
    await handleManageBilling();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Facturation
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
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400">
          Gérez votre facturation, téléchargez vos factures et mettez à jour vos informations de paiement.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Gérer ma facturation
          </Button>

          <Button
            variant="secondary"
            onClick={handleViewInvoices}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Voir mes factures
          </Button>
        </div>

        {/* Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                Portail de gestion sécurisé
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Vous serez redirigé vers un portail Stripe sécurisé pour gérer votre abonnement, 
                télécharger vos factures et mettre à jour vos informations de paiement.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Toutes les transactions sont sécurisées par Stripe</p>
          <p>• Factures disponibles en PDF</p>
          <p>• Support client 24/7 pour la facturation</p>
        </div>
      </div>
    </div>
  );
}
