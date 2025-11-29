/**
 * 🎯 Composant PlanPlans - Sélection de plans
 */

import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Star, Rocket } from 'lucide-react';
import { Button } from '../ui/Button';
import { PLANS } from '../../config/planPrices';
import { getPriceIdAuto, isPromoActiveSync } from '../../config/stripePrices';
import { planCheckoutService } from '../../services/planCheckoutService';
import { supabase } from '../../lib/supabase';

interface PlanPlansProps {
  currentPlanId?: string;
  onSelectPlan?: (planId: string) => void;
  loading?: boolean;
}

export function PlanPlans({ currentPlanId = 'free', onSelectPlan, loading = false }: PlanPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    if (planKey === currentPlanId) return;
    
    setSelectedPlan(planKey);
    
    // Pour le plan gratuit
    if (planKey === 'free') {
      onSelectPlan?.(planKey);
      return;
    }

    // Pour Teams, rediriger vers contact
    if (planKey === 'teams') {
      window.open('https://centrinote.fr/support', '_blank');
      return;
    }

    // Pour les plans payants (starter, pro), utiliser le nouveau système
    if (planKey === 'starter' || planKey === 'pro' || planKey === 'teams') {
      try {
        // Récupérer le token JWT
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('❌ Pas de session utilisateur');
          return;
        }

        // Utiliser planCheckoutService pour lancer le checkout
        const result = await planCheckoutService.checkoutPlanSync(
          planKey as 'starter' | 'pro' | 'teams',
          session.user.email || session.user.id,
          session.access_token
        );

        if (result.success && result.url) {
          window.location.href = result.url;
        } else {
          console.error('❌ Erreur checkout:', result.error);
        }
      } catch (error) {
        console.error('❌ Error getting price ID:', error);
      }
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return Check;
      case 'starter': return Rocket;
      case 'pro': return Zap;
      case 'teams': return Crown;
      default: return Check;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'free': return 'border-gray-200 dark:border-gray-700';
      case 'starter': return 'border-indigo-500 dark:border-indigo-400';
      case 'pro': return 'border-purple-500 dark:border-purple-400';
      case 'teams': return 'border-blue-500 dark:border-blue-400';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getPlanButtonVariant = (planId: string) => {
    if (planId === currentPlanId) return 'secondary';
    if (planId === 'starter') return 'default'; // Starter est populaire
    return 'secondary';
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choisir un plan
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sélectionnez le plan qui correspond le mieux à vos besoins
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const PlanIcon = getPlanIcon(plan.key);
          const isCurrentPlan = plan.key === currentPlanId;
          const isSelected = selectedPlan === plan.key;
          const isPopular = (plan as any).isPopular || plan.key === 'starter'; // Starter est populaire
          const hasPromo = (plan as any).pricePromo && (plan as any).priceNormal && isPromoActiveSync(plan.key as any);
          const displayPrice = hasPromo ? (plan as any).pricePromo : (plan as any).price || 0;
          const normalPrice = (plan as any).priceNormal;
          const discount = (plan as any).discount;

          return (
            <div
              key={plan.key}
              className={`
                relative rounded-xl border-2 p-6 transition-all duration-200
                ${isCurrentPlan 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : isPopular
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : getPlanColor(plan.key)
                }
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                hover:shadow-lg cursor-pointer
              `}
              onClick={() => handleSelectPlan(plan.key)}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    POPULAR
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Plan actuel
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 mb-3">
                  <PlanIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plan.label}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {plan.desc}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                {plan.key === 'free' ? (
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    Gratuit
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-2">
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        {displayPrice.toFixed(2).replace('.', ',')}€
                      </div>
                      {hasPromo && normalPrice && (
                        <div className="text-lg text-gray-400 line-through">
                          {normalPrice.toFixed(2).replace('.', ',')}€
                        </div>
                      )}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      par mois
                      {hasPromo && discount && (
                        <span className="text-orange-600 font-semibold ml-2">
                          • Économisez {discount}%
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Button
                variant={getPlanButtonVariant(plan.key)}
                onClick={() => handleSelectPlan(plan.key)}
                disabled={isCurrentPlan || loading}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tous les plans incluent un essai gratuit • Annulation possible à tout moment
        </p>
      </div>
    </div>
  );
}
