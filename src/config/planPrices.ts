/**
 * 🎯 Configuration des prix LIVE Stripe (LEGACY - pour compatibilité)
 * ⚠️ DÉPRÉCIÉ: Utiliser stripePrices.ts pour les nouveaux plans
 */

export const PRICES = {
  free: import.meta.env.VITE_Free_ID || 'price_1Rbo5uLalEotrAUvbBwwtrZu',
  pro: import.meta.env.VITE_PRO_PRICE_ID || 'price_1Rbo6rLalEotrAUvDy2s3aub',
  focus: import.meta.env.VITE_Focus_ID || 'price_1Rbo7aLalEotrAUvy17PgJT2',
};

export function getPriceIdOrThrow(tier: 'free' | 'pro' | 'focus'): string {
  const id = PRICES[tier];
  
  // Debug logs
  console.log(`🔍 Debug price_id for ${tier}:`, {
    envVar: tier === 'free' ? import.meta.env.VITE_Free_ID : 
            tier === 'pro' ? import.meta.env.VITE_PRO_PRICE_ID : 
            import.meta.env.VITE_Focus_ID,
    finalId: id
  });
  
  if (!id || !id.startsWith('price_')) {
    throw new Error(`Invalid LIVE priceId for ${tier}: ${id}`);
  }
  return id;
}

// Configuration des plans pour l'UI (NOUVEAUX PLANS: Free, Starter, Pro, Teams)
export const PLANS = [
  { 
    key: 'free', 
    label: 'Free', 
    desc: 'Pour démarrer', 
    cta: 'Rester sur Free',
    price: 0,
    pricePromo: null,
    priceNormal: null,
    features: [
      'Notes illimitées (texte brut)',
      '50 mots vocabulaire',
      '1 réunion 45 min + résumé IA',
      '1 automation',
      '3 participants max par réunion'
    ]
  },
  { 
    key: 'starter', 
    label: 'Starter', 
    desc: '⭐ POPULAIRE', 
    cta: 'Profiter de la promo 🔥',
    price: 9.99,
    pricePromo: 9.99,
    priceNormal: 12.99,
    discount: 23,
    isPopular: true,
    features: [
      '150k tokens IA',
      '10 réunions 45 min',
      '8 participants max par réunion',
      '5 résumés IA',
      '100 mots vocabulaire',
      '5 automations'
    ]
  },
  { 
    key: 'pro', 
    label: 'Pro', 
    desc: 'Pour aller plus loin', 
    cta: 'Choisir Pro',
    price: 19.99,
    pricePromo: 19.99,
    priceNormal: 29.99,
    discount: 33,
    features: [
      '600k tokens IA',
      '20 réunions 60 min',
      '15 participants max par réunion',
      'Résumés IA illimités',
      '500 mots vocabulaire',
      'Automations illimitées'
    ]
  },
  { 
    key: 'teams', 
    label: 'Teams', 
    desc: 'Équipe & scale', 
    cta: 'Choisir Teams',
    price: 39.99,
    pricePromo: 39.99,
    priceNormal: 49.99,
    discount: 20,
    features: [
      'Tokens IA illimités',
      '60 réunions 60 min',
      'Participants illimités',
      'Résumés IA illimités',
      'Vocabulaire illimité',
      'Automations illimitées',
      'Admin dashboard',
      'Support prioritaire'
    ]
  },
];
