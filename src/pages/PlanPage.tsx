/**
 * 📋 Page Plan - Gestion des abonnements
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { PlanOverview } from '../components/plan/PlanOverview';
import { PlanPlans } from '../components/plan/PlanPlans';
import { PlanSection } from '../components/plan/PlanSection';
import { stripeCheckoutService } from '../services/stripeCheckout';
import { checkEnvironmentVariables } from '../utils/checkEnv';
import { testStripeFunction } from '../utils/testStripeFunction';
import { supabase } from '../lib/supabase';

export function PlanPage() {
  const { state } = useApp();
  const location = useLocation();
  
  // Vérifier si un plan est passé en paramètre URL
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const planParam = searchParams.get('plan');
    
    if (planParam && ['starter', 'pro', 'teams'].includes(planParam)) {
      // Pour starter, pro et teams, lancer le checkout automatiquement
      const { user } = state;
      if (user?.id && user?.email) {
        // Récupérer le token JWT de la session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error || !session) {
            console.error('❌ Erreur récupération session:', error);
            return;
          }

          const userToken = session.access_token;

          // Importer dynamiquement pour éviter les dépendances circulaires
          import('../services/planCheckoutService').then(({ planCheckoutService }) => {
            planCheckoutService.checkoutPlanSync(
              planParam as 'starter' | 'pro' | 'teams',
              user.email || user.id,
              userToken
            ).then(result => {
              if (result.success && result.url) {
                window.location.href = result.url;
              } else {
                console.error('❌ Erreur checkout:', result.error);
              }
            });
          });
        });
      }
    }
  }, [location.search, state.user, state]);
  const { user } = state;
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔍 Diagnostic Stripe au chargement (désactivé en production)
  useEffect(() => {
    // Activer uniquement en mode développement
    if (import.meta.env.DEV) {
      console.log('🔍 DIAGNOSTIC STRIPE - Mode développement');
      checkEnvironmentVariables();
    }
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!user?.id) {
      console.error('❌ No user ID');
      return;
    }

    try {
      setLoading(true);

      // Pour le plan free, pas besoin de checkout
      if (planId === 'free') {
        return;
      }

      // Guard: Vérifier le format du priceId
      if (!planId || !planId.startsWith('price_')) {
        console.error('❌ Invalid priceId format:', planId);
        alert('Erreur: Price ID invalide. Format attendu: price_...');
        return;
      }

      // Pour les plans payants, redirection vers Stripe
      const planNames: Record<string, string> = {
        [import.meta.env.VITE_Free_ID || 'price_1Rbo5uLalEotrAUvbBwwtrZu']: 'Plan Free',
        [import.meta.env.VITE_PRO_PRICE_ID || 'price_1Rbo6rLalEotrAUvDy2s3aub']: 'Plan Pro',
        [import.meta.env.VITE_Focus_ID || 'price_1Rbo7aLalEotrAUvy17PgJT2']: 'Plan Focus'
      };

      const planName = planNames[planId] || `Plan (${planId.substring(0, 20)}...)`;

      // Redirection directe sans confirmation (l'utilisateur a déjà cliqué sur le bouton)
      try {
        // Récupérer le token JWT de l'utilisateur connecté
        const { data: { session } } = await supabase.auth.getSession();
        const userToken = session?.access_token;

        // Créer une session de checkout via l'API Stripe
        const result = await stripeCheckoutService.createCheckoutSession(
          planId,
          user.email || user.id,
          userToken
        );

        if (result.success && result.url) {
          // Redirection immédiate vers Stripe
          window.location.href = result.url;
        } else {
          console.error('❌ Erreur création session:', result.error);
          alert(`Erreur: ${result.error || 'Impossible de créer la session de paiement'}`);
        }
      } catch (error) {
        console.error('❌ Exception lors du checkout:', error);
        alert('Erreur lors de la création de la session de paiement');
      }

    } catch (error) {
      console.error('Erreur sélection plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    setShowPlans(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Veuillez vous connecter pour accéder à la gestion de votre plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestion de votre plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérez votre abonnement et découvrez nos plans
          </p>
        </div>

        <div className="space-y-8">
          {/* Plan Overview */}
          <PlanOverview 
            userId={user.id} 
            onUpgrade={handleUpgrade}
          />

          {/* Plans Selection */}
          {showPlans && (
            <PlanPlans
              currentPlanId="free" // TODO: Récupérer le plan actuel
              onSelectPlan={handleSelectPlan}
              loading={loading}
            />
          )}

          {/* Billing Section */}
          <PlanSection userId={user.id} />
        </div>
      </div>
    </div>
  );
}
