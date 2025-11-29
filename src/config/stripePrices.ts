/**
 * 🎯 Configuration stylisée des prix Stripe
 * Supporte les prix normaux et promo pour chaque plan
 */

export const STRIPE_PRICES = {
  starter: {
    normal: import.meta.env.VITE_PRICE_ID_starter_normal || '',
    promo: import.meta.env.VITE_PRICE_ID_starter_promo || '',
  },
  pro: {
    normal: import.meta.env.VITE_PRICE_ID_PRO_normal || '',
    promo: import.meta.env.VITE_PRICE_ID_pro_promo || '',
  },
  teams: {
    normal: import.meta.env.VITE_PRICE_ID_teams_normal || '',
    promo: import.meta.env.VITE_PRICE_ID_teams_promo || '',
  },
} as const;

/**
 * Récupère le price_id selon le plan et si on est en promo
 * @param plan - 'starter' | 'pro' | 'teams'
 * @param usePromo - true pour utiliser le prix promo, false pour le prix normal
 * @returns Le price_id Stripe
 */
export function getPriceId(plan: 'starter' | 'pro' | 'teams', usePromo: boolean = true): string {
  const priceId = usePromo ? STRIPE_PRICES[plan].promo : STRIPE_PRICES[plan].normal;
  
  if (!priceId) {
    throw new Error(`Price ID not found for plan ${plan} (promo: ${usePromo})`);
  }
  
  // Vérifier que c'est bien un Price ID (commence par 'price_')
  // ⚠️ ATTENTION: Les variables que vous avez fournies commencent par 'prod_'
  // Ce sont des Product IDs, pas des Price IDs !
  // Les Price IDs Stripe commencent par 'price_'
  if (!priceId.startsWith('price_')) {
    console.warn(`⚠️ WARNING: ${priceId} ne commence pas par 'price_'. C'est peut-être un Product ID au lieu d'un Price ID.`);
  }
  
  return priceId;
}

/**
 * Détermine si on est en période promo (basé sur promo_end_date dans subscription_plans)
 * @param planName - Nom du plan ('starter' | 'pro' | 'teams')
 * @returns Promise<boolean> - true si on est en promo, false sinon
 */
export async function isPromoActive(planName?: 'starter' | 'pro' | 'teams'): Promise<boolean> {
  try {
    // Import dynamique pour éviter les dépendances circulaires
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );

    // Si un plan spécifique est demandé, vérifier uniquement celui-ci
    if (planName) {
      const { data } = await supabase
        .from('subscription_plans')
        .select('promo_end_date')
        .eq('name', planName)
        .single();

      if (data?.promo_end_date) {
        const promoEnd = new Date(data.promo_end_date);
        return new Date() < promoEnd;
      }
      return false;
    }

    // Sinon, vérifier si au moins un plan a une promo active
    const { data } = await supabase
      .from('subscription_plans')
      .select('promo_end_date')
      .not('promo_end_date', 'is', null);

    if (!data || data.length === 0) return false;

    // Vérifier si au moins une promo est active
    return data.some(plan => {
      if (!plan.promo_end_date) return false;
      const promoEnd = new Date(plan.promo_end_date);
      return new Date() < promoEnd;
    });
  } catch (error) {
    console.warn('⚠️ Erreur vérification promo, fallback sur true:', error);
    // En cas d'erreur, on assume que la promo est active (sécurisé)
    return true;
  }
}

/**
 * Version synchrone (utilise localStorage pour cache)
 * @param planName - Nom du plan
 * @returns boolean
 */
export function isPromoActiveSync(planName?: 'starter' | 'pro' | 'teams'): boolean {
  try {
    const cacheKey = planName ? `promo_${planName}` : 'promo_active';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { value, expires } = JSON.parse(cached);
      if (new Date() < new Date(expires)) {
        return value;
      }
    }
    // Si pas de cache valide, retourner true par défaut (sera mis à jour par la version async)
    return true;
  } catch {
    return true;
  }
}

/**
 * Récupère le price_id automatiquement (promo si active, sinon normal)
 * Version synchrone (utilise cache localStorage)
 */
export function getPriceIdAuto(plan: 'starter' | 'pro' | 'teams'): string {
  return getPriceId(plan, isPromoActiveSync(plan));
}

/**
 * Récupère le price_id automatiquement (version async, vérifie en temps réel)
 */
export async function getPriceIdAutoAsync(plan: 'starter' | 'pro' | 'teams'): Promise<string> {
  const usePromo = await isPromoActive(plan);
  
  // Mettre en cache pour la version sync
  try {
    const cacheKey = `promo_${plan}`;
    const expires = new Date(Date.now() + 5 * 60 * 1000); // Cache 5 minutes
    localStorage.setItem(cacheKey, JSON.stringify({ value: usePromo, expires }));
  } catch (e) {
    // Ignorer les erreurs localStorage
  }
  
  return getPriceId(plan, usePromo);
}

/**
 * Trouve le plan name depuis un price_id
 * @param priceId - Le price_id Stripe
 * @returns Le nom du plan ('starter' | 'pro' | 'teams' | null)
 */
export function getPlanNameFromPriceId(priceId: string): 'starter' | 'pro' | 'teams' | null {
  for (const [planName, prices] of Object.entries(STRIPE_PRICES)) {
    if (prices.normal === priceId || prices.promo === priceId) {
      return planName as 'starter' | 'pro' | 'teams';
    }
  }
  return null;
}

