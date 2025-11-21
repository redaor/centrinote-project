/**
 * 🎯 Service Stripe Checkout - Appel côté serveur (Edge Function)
 */

import { STRIPE_PRICE_IDS } from '../config/stripe-prices';

export class StripeCheckoutService {
  /**
   * Créer une session de checkout Stripe via Edge Function
   */
  async createCheckoutSession(priceId: string, userEmail: string, userToken?: string): Promise<{
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

      // Guard: Vérifier le format du priceId
      if (!priceId?.startsWith('price_')) {
        console.error('❌ Invalid priceId format:', priceId);
        return {
          success: false,
          error: `Invalid priceId format: ${priceId}. Must start with 'price_'`
        };
      }

      // URLs de redirection
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/plan?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/plan?status=canceled`;

      // Envoyer price_id (et non priceId) pour correspondre au backend
      const requestPayload = {
        price_id: priceId,
        customer_email: userEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode: 'subscription'
      };

      // Utiliser le token utilisateur si disponible, sinon fallback sur anon key
      const authToken = userToken || import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Appeler la Edge Function Supabase
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('❌ Checkout failed:', response.status, errorText);
        throw new Error(`Checkout failed ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.url) {
        console.error('❌ Pas d\'URL dans la réponse:', data);
        throw new Error('No checkout URL returned from Edge Function');
      }

      return {
        success: true,
        url: data.url
      };

    } catch (error) {
      console.error('❌ Erreur création session checkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export const stripeCheckoutService = new StripeCheckoutService();
