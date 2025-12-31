/**
 * 🎯 Configuration stylisée des prix Stripe
 * Supporte les prix normaux et promo pour chaque plan
 * 
 * ⚠️ IMPORTANT: Ces variables sont gérées via Netlify (pas dans .env local)
 * - En production: Variables configurées dans Netlify Dashboard
 * - En développement local: Variables peuvent être absentes (avertissement uniquement)
 */

// Détection de l'environnement
const isProduction = import.meta.env.PROD;
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isDevelopment = import.meta.env.DEV && isLocalhost;

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
  
  if (!priceId || priceId.trim() === '') {
    // Construire le nom de la variable d'environnement manquante
    const envVarName = usePromo 
      ? `VITE_PRICE_ID_${plan}_promo`
      : plan === 'pro' 
        ? 'VITE_PRICE_ID_PRO_normal'
        : `VITE_PRICE_ID_${plan}_normal`;
    
    // Log technique dans la console UNIQUEMENT (jamais dans l'UI)
    if (isDevelopment) {
      console.error(
        `❌ [TECHNICAL] Price ID not found for plan ${plan} (promo: ${usePromo})\n` +
        `📝 [TECHNICAL] Variable d'environnement manquante: ${envVarName}\n` +
        `💡 [TECHNICAL] Cette variable est configurée dans Netlify Dashboard (pas dans .env local).\n` +
        `   Le checkout fonctionne uniquement en production où les variables sont disponibles.\n` +
        `🔍 [TECHNICAL] Pour tester en local, ajoutez temporairement dans .env.local :\n` +
        `   ${envVarName}=price_xxxxxxxxxxxxx\n` +
        `⚠️ [TECHNICAL] Ne commitez PAS cette variable dans .env`
      );
    } else {
      console.error(
        `❌ [TECHNICAL] Price ID not found for plan ${plan} (promo: ${usePromo})\n` +
        `📝 [TECHNICAL] Variable d'environnement manquante: ${envVarName}\n` +
        `💡 [TECHNICAL] Cette variable doit être configurée dans Netlify Dashboard :\n` +
        `   1. Allez sur https://app.netlify.com/sites/[votre-site]/configuration/env\n` +
        `   2. Ajoutez la variable: ${envVarName}\n` +
        `   3. Valeur: price_xxxxxxxxxxxxx (obtenu depuis Stripe Dashboard)\n` +
        `🔍 [TECHNICAL] Pour obtenir le Price ID depuis Stripe Dashboard :\n` +
        `   1. Allez sur https://dashboard.stripe.com/products\n` +
        `   2. Sélectionnez le produit correspondant au plan "${plan}"\n` +
        `   3. Copiez le Price ID (commence par "price_")`
      );
    }
    
    // Lancer une erreur générique (sans détails techniques)
    throw new Error('Configuration manquante');
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
    const { supabase } = await import('../lib/supabase');

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
  const usePromo = isPromoActiveSync(plan);
  
  // Vérifier si le Price ID promo existe
  const hasPromoPrice = STRIPE_PRICES[plan].promo && STRIPE_PRICES[plan].promo.trim() !== '';
  const hasNormalPrice = STRIPE_PRICES[plan].normal && STRIPE_PRICES[plan].normal.trim() !== '';
  
  // Si aucune variable n'est configurée, log technique dans la console UNIQUEMENT
  if (!hasPromoPrice && !hasNormalPrice) {
    const normalVar = plan === 'pro' ? 'VITE_PRICE_ID_PRO_normal' : `VITE_PRICE_ID_${plan}_normal`;
    const promoVar = `VITE_PRICE_ID_${plan}_promo`;
    
    // Log technique dans la console UNIQUEMENT (jamais dans l'UI)
    if (isDevelopment) {
      console.error(
        `❌ [TECHNICAL] Aucun Price ID configuré pour le plan ${plan}\n` +
        `📝 [TECHNICAL] Variables d'environnement manquantes :\n` +
        `   - ${normalVar}\n` +
        `   - ${promoVar} (optionnel si pas de promo)\n` +
        `💡 [TECHNICAL] Ces variables sont configurées dans Netlify Dashboard (pas dans .env local).\n` +
        `   Le checkout fonctionne uniquement en production où les variables sont disponibles.\n` +
        `🔍 [TECHNICAL] Pour tester en local, ajoutez temporairement dans .env.local :\n` +
        `   ${normalVar}=price_xxxxxxxxxxxxx\n` +
        `⚠️ [TECHNICAL] Ne commitez PAS ces variables dans .env`
      );
    } else {
      console.error(
        `❌ [TECHNICAL] Aucun Price ID configuré pour le plan ${plan}\n` +
        `📝 [TECHNICAL] Variables d'environnement manquantes :\n` +
        `   - ${normalVar}\n` +
        `   - ${promoVar} (optionnel si pas de promo)\n` +
        `💡 [TECHNICAL] Ces variables doivent être configurées dans Netlify Dashboard :\n` +
        `   1. Allez sur https://app.netlify.com/sites/[votre-site]/configuration/env\n` +
        `   2. Ajoutez au minimum: ${normalVar}\n` +
        `   3. Valeur: price_xxxxxxxxxxxxx (obtenu depuis Stripe Dashboard)\n` +
        `🔍 [TECHNICAL] Pour obtenir le Price ID depuis Stripe Dashboard :\n` +
        `   1. Allez sur https://dashboard.stripe.com/products\n` +
        `   2. Sélectionnez le produit correspondant au plan "${plan}"\n` +
        `   3. Copiez le Price ID (commence par "price_")`
      );
    }
    
    // Lancer une erreur générique (sans détails techniques)
    throw new Error('Configuration manquante');
  }
  
  // Si promo active mais Price ID promo non configuré, utiliser le prix normal
  if (usePromo && !hasPromoPrice) {
    console.warn(`⚠️ [TECHNICAL] Promo active pour ${plan} mais Price ID promo non configuré (VITE_PRICE_ID_${plan}_promo manquante), utilisation du prix normal`);
    return getPriceId(plan, false);
  }
  
  return getPriceId(plan, usePromo);
}

/**
 * Récupère le price_id automatiquement (version async, vérifie en temps réel)
 */
export async function getPriceIdAutoAsync(plan: 'starter' | 'pro' | 'teams'): Promise<string> {
  const usePromo = await isPromoActive(plan);
  
  // Si promo active mais Price ID promo non configuré, utiliser le prix normal
  const finalUsePromo = usePromo && STRIPE_PRICES[plan].promo && STRIPE_PRICES[plan].promo.trim() !== '';
  
  // Mettre en cache pour la version sync
  try {
    const cacheKey = `promo_${plan}`;
    const expires = new Date(Date.now() + 5 * 60 * 1000); // Cache 5 minutes
    localStorage.setItem(cacheKey, JSON.stringify({ value: finalUsePromo, expires }));
  } catch (e) {
    // Ignorer les erreurs localStorage
  }
  
  if (usePromo && !finalUsePromo) {
    console.warn(`⚠️ [TECHNICAL] Promo active pour ${plan} mais Price ID promo non configuré (VITE_PRICE_ID_${plan}_promo manquante), utilisation du prix normal`);
  }
  
  return getPriceId(plan, finalUsePromo);
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

