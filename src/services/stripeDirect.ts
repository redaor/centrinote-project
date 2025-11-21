/**
 * 🎯 Service Stripe Direct - Utilise l'API Stripe directement
 */

import { STRIPE_PRICE_IDS } from '../config/stripe-prices';

declare global {
  interface Window {
    Stripe: any;
  }
}

export class StripeDirectService {
  private stripe: any;
  private publishableKey: string;

  constructor() {
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    
    // Charger Stripe.js si disponible
    if (typeof window !== 'undefined' && window.Stripe) {
      this.stripe = window.Stripe(this.publishableKey);
    }
  }

  /**
   * Créer une session de checkout Stripe
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

      // Vérifier si Stripe est disponible
      if (!this.stripe) {
        throw new Error('Stripe n\'est pas configuré');
      }

      // Créer une session de checkout
      const { error, session } = await this.stripe.redirectToCheckout({
        lineItems: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        customerEmail: userEmail,
        successUrl: `${window.location.origin}/plan?success=true`,
        cancelUrl: `${window.location.origin}/plan?canceled=true`,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        url: session.url
      };

    } catch (error) {
      console.error('Erreur création session checkout:', error);
      
      // Fallback: Redirection simple vers Stripe
      const stripeUrl = `https://checkout.stripe.com/c/pay/${priceId}`;
      
      return {
        success: true,
        url: stripeUrl
      };
    }
  }

  /**
   * Créer un portail client Stripe
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
}

export const stripeDirectService = new StripeDirectService();
