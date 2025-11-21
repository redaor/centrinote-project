/**
 * ⚠️ DÉPRÉCIÉ: Ce fichier est maintenant un wrapper de planPrices.ts
 * Utilisez directement planPrices.ts pour de nouvelles fonctionnalités
 */

import { PRICES } from './planPrices';

// ⚠️ DÉPRÉCIÉ: Utiliser PRICES depuis planPrices.ts à la place
export const STRIPE_PRICE_IDS = {
  FREE: PRICES.free,
  PRO: PRICES.pro,
  FOCUS: PRICES.focus, // Remplace BUSINESS
  // Backward compatibility
  BUSINESS: PRICES.focus, // ⚠️ DÉPRÉCIÉ: Utiliser FOCUS
} as const;

// ⚠️ DÉPRÉCIÉ: Configuration simplifiée, utiliser PLANS depuis planPrices.ts
export const PLAN_CONFIG = {
  free: {
    name: 'Plan Free',
    description: 'Parfait pour commencer',
    price: 0,
    currency: 'eur',
    interval: 'month' as const,
    priceId: PRICES.free,
  },
  pro: {
    name: 'Plan Pro',
    description: 'Pour les utilisateurs avancés',
    price: 9.99,
    currency: 'eur',
    interval: 'month' as const,
    priceId: PRICES.pro,
  },
  focus: {
    name: 'Plan Focus',
    description: 'Pour les équipes',
    price: 29.99,
    currency: 'eur',
    interval: 'month' as const,
    priceId: PRICES.focus,
  }
} as const;
