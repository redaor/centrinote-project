/**
 * 🎯 Configuration des prix LIVE Stripe
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

// Configuration des plans pour l'UI
export const PLANS = [
  { 
    key: 'free', 
    label: 'Free', 
    desc: 'Pour démarrer', 
    cta: 'Rester sur Free',
    features: ['Jusqu\'à 5 notes', 'Vocabulaire de base', 'Support communautaire']
  },
  { 
    key: 'pro', 
    label: 'Pro', 
    desc: 'Pour aller plus loin', 
    cta: 'Choisir Pro',
    features: ['Notes illimitées', 'Vocabulaire avancé', 'IA intégrée', 'Support prioritaire']
  },
  { 
    key: 'focus', 
    label: 'Focus', 
    desc: 'Équipe & scale', 
    cta: 'Choisir Focus',
    features: ['Tout du Plan Pro', 'Collaboration équipe', 'Analytics avancées', 'Support dédié']
  },
];
