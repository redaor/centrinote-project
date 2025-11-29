/**
 * 🎯 Service pour gérer le checkout depuis un plan name (starter, pro, teams)
 * Convertit le plan name en price_id et lance le checkout
 */

import { getPriceIdAuto, getPriceIdAutoAsync } from '../config/stripePrices';
import { stripeCheckoutService } from './stripeCheckout';
import { supabase } from '../lib/supabase';

export class PlanCheckoutService {
  /**
   * Lance le checkout pour un plan (starter, pro, teams)
   * @param planName - Nom du plan ('starter' | 'pro' | 'teams')
   * @param userEmail - Email de l'utilisateur
   * @param userToken - Token JWT (optionnel)
   * @returns URL de checkout ou erreur
   */
  async checkoutPlan(
    planName: 'starter' | 'pro' | 'teams',
    userEmail: string,
    userToken?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Récupérer le price_id (promo si active, sinon normal)
      const priceId = await getPriceIdAutoAsync(planName);

      // Créer la session de checkout
      return await stripeCheckoutService.createCheckoutSession(
        priceId,
        userEmail,
        userToken
      );
    } catch (error) {
      console.error(`❌ Erreur checkout plan ${planName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Version synchrone (utilise cache localStorage)
   */
  checkoutPlanSync(
    planName: 'starter' | 'pro' | 'teams',
    userEmail: string,
    userToken?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Récupérer le price_id (version sync avec cache)
      const priceId = getPriceIdAuto(planName);

      // Créer la session de checkout
      return stripeCheckoutService.createCheckoutSession(
        priceId,
        userEmail,
        userToken
      );
    } catch (error) {
      console.error(`❌ Erreur checkout plan ${planName}:`, error);
      return Promise.resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  }
}

export const planCheckoutService = new PlanCheckoutService();

