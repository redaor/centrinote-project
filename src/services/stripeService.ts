/**
 * 💳 Service Stripe - Gestion des abonnements et paiements
 */

import { supabase } from '../lib/supabase';

const DEBUG = import.meta.env.DEV;

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  price_id: string;
}

export interface PlanInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Plan Free',
    description: 'Parfait pour commencer',
    price: 0,
    currency: 'eur',
    interval: 'month',
    features: [
      'Jusqu\'à 5 notes',
      'Vocabulaire de base',
      'Support communautaire'
    ]
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    description: 'Pour les utilisateurs avancés',
    price: 9.99,
    currency: 'eur',
    interval: 'month',
    popular: true,
    features: [
      'Notes illimitées',
      'Vocabulaire avancé',
      'IA intégrée',
      'Support prioritaire'
    ]
  },
  {
    id: 'business',
    name: 'Plan Business',
    description: 'Pour les équipes',
    price: 29.99,
    currency: 'eur',
    interval: 'month',
    features: [
      'Tout du Plan Pro',
      'Collaboration équipe',
      'Analytics avancées',
      'Support dédié'
    ]
  }
];

class StripeService {
  /**
   * Créer une session de checkout Stripe
   */
  async createCheckoutSession(priceId: string, userEmail: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      DEBUG && console.log('[StripeService] Création session checkout:', { priceId, userEmail });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          customerEmail: userEmail,
          successUrl: `${window.location.origin}/plan?success=true`,
          cancelUrl: `${window.location.origin}/plan?canceled=true`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('Aucune URL de checkout reçue');
      }

      return { success: true, url: data.url };

    } catch (error: any) {
      DEBUG && console.error('[StripeService] Erreur checkout:', error);
      return {
        success: false,
        error: error.message || 'Impossible de créer la session de paiement'
      };
    }
  }

  /**
   * Créer une session de portail client Stripe
   */
  async createCustomerPortal(
    customerId: string,
    returnUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      DEBUG && console.log('[StripeService] Création portail client:', { customerId });

      const { data, error } = await supabase.functions.invoke('create-customer-portal', {
        body: {
          customerId,
          returnUrl: returnUrl || `${window.location.origin}/plan`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('Aucune URL de portail reçue');
      }

      return { success: true, url: data.url };

    } catch (error: any) {
      DEBUG && console.error('[StripeService] Erreur portail client:', error);
      return {
        success: false,
        error: error.message || 'Impossible d\'ouvrir le portail de gestion'
      };
    }
  }

  /**
   * Obtenir les informations d'abonnement
   */
  async getSubscriptionInfo(userId: string): Promise<{
    success: boolean;
    subscription?: StripeSubscription;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-subscription-info', {
        body: { userId }
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, subscription: data };

    } catch (error: any) {
      DEBUG && console.error('[StripeService] Erreur info abonnement:', error);
      return {
        success: false,
        error: error.message || 'Impossible de récupérer les informations d\'abonnement'
      };
    }
  }

  /**
   * Mettre à niveau vers un plan
   */
  async upgradeToPlan(priceId: string, userId: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    return this.createCheckoutSession(priceId, userId);
  }
}

export const stripeService = new StripeService();