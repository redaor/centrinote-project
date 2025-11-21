/**
 * 🔧 Service Stripe Fallback - Fonctionne sans Edge Functions
 */

import { STRIPE_PRICE_IDS } from '../config/stripe-prices';

export class StripeServiceFallback {
  private publishableKey: string;

  constructor() {
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Créer une session de checkout Stripe (version fallback)
   */
  async createCheckoutSession(priceId: string, userEmail: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Pour le plan gratuit, pas de redirection
      if (priceId === STRIPE_PRICE_IDS.FREE) {
        return {
          success: true,
          url: '#'
        };
      }

      // Créer une URL de checkout Stripe avec les paramètres corrects
      const baseUrl = 'https://checkout.stripe.com';
      const params = new URLSearchParams({
        'client_reference_id': userEmail,
        'prefilled_email': userEmail,
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': `${window.location.origin}/plan?success=true`,
        'cancel_url': `${window.location.origin}/plan?canceled=true`
      });

      const stripeCheckoutUrl = `${baseUrl}/c/pay?${params.toString()}`;
      
      return {
        success: true,
        url: stripeCheckoutUrl
      };

    } catch (error) {
      console.error('Erreur création session checkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Créer un portail client Stripe (version fallback)
   */
  async createCustomerPortal(customerId: string, returnUrl?: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Redirection vers le portail client Stripe
      const portalUrl = `https://billing.stripe.com/p/login`;
      
      return {
        success: true,
        url: portalUrl
      };

    } catch (error) {
      console.error('Erreur création portail client:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Obtenir les produits disponibles
   */
  getProducts() {
    return [
      {
        id: 'free',
        name: 'Plan Free',
        price: 0,
        priceId: STRIPE_PRICE_IDS.FREE,
        features: ['Jusqu\'à 5 notes', 'Vocabulaire de base', 'Support communautaire']
      },
      {
        id: 'pro',
        name: 'Plan Pro',
        price: 9.99,
        priceId: STRIPE_PRICE_IDS.PRO,
        features: ['Notes illimitées', 'Vocabulaire avancé', 'IA intégrée', 'Support prioritaire']
      },
      {
        id: 'business',
        name: 'Plan Business',
        price: 29.99,
        priceId: STRIPE_PRICE_IDS.BUSINESS,
        features: ['Tout du Plan Pro', 'Collaboration équipe', 'Analytics avancées', 'Support dédié']
      }
    ];
  }
}

export const stripeServiceFallback = new StripeServiceFallback();
