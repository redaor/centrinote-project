/**
 * Service de gestion des quotas utilisateur
 * Permet de vérifier et incrémenter les quotas pour chaque feature
 */

import { supabase } from '../lib/supabase';

export interface QuotaCheckResult {
  allowed: boolean;
  usage: number;
  limit: number | 'unlimited';
  percentage: number;
  message?: string;
  plan_name?: string;
  plan_display_name?: string;
  upgrade_required?: boolean;
}

export interface MeetingDurationCheckResult {
  allowed: boolean;
  max_duration: number | null;
  requested_duration: number;
  message?: string;
  upgrade_required?: boolean;
}

/**
 * Vérifie si l'utilisateur peut consommer une feature
 */
export async function checkQuota(
  userId: string,
  feature: string,
  increment: number = 1
): Promise<QuotaCheckResult> {
  try {
    const rpcPromise = supabase.rpc('check_quota', {
      p_user_id: userId,
      p_feature: feature,
      p_increment: increment
    });

    // Timeout de 8 secondes
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: requête trop longue')), 8000)
    );

    const { data, error } = await Promise.race([
      rpcPromise,
      timeoutPromise
    ]) as any;

    if (error) {
      // Ignorer les erreurs réseau (Failed to fetch est normal si connexion instable)
      if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
        console.warn('⚠️ Erreur réseau check_quota (ignorée):', error.message);
        // Retourner un résultat par défaut qui permet l'action
        return { allowed: true, remaining: 999, limit: 1000 };
      }
      console.error('❌ Erreur check_quota:', error);
      throw error;
    }

    return data as QuotaCheckResult;
  } catch (error) {
    // Gérer les timeouts et erreurs réseau
    if (error instanceof Error && error.message?.includes('Timeout')) {
      console.warn('⚠️ Timeout check_quota (ignoré)');
      // Retourner un résultat par défaut qui permet l'action
      return { allowed: true, remaining: 999, limit: 1000 };
    }
    if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
      console.warn('⚠️ Erreur réseau check_quota (ignorée)');
      return { allowed: true, remaining: 999, limit: 1000 };
    }
    throw error;
  }
}

/**
 * Incrémente le compteur d'usage d'une feature
 */
export async function incrementQuota(
  userId: string,
  feature: string,
  amount: number = 1
): Promise<void> {
  const { error } = await supabase.rpc('increment_quota', {
    p_user_id: userId,
    p_feature: feature,
    p_amount: amount
  });

  if (error) {
    console.error('❌ Erreur increment_quota:', error);
    throw error;
  }
}

/**
 * Vérifie si la durée de réunion est autorisée pour le plan de l'utilisateur
 */
export async function checkMeetingDurationLimit(
  userId: string,
  durationMinutes: number
): Promise<MeetingDurationCheckResult> {
  const { data, error } = await supabase.rpc('check_meeting_duration_limit', {
    p_user_id: userId,
    p_duration_minutes: durationMinutes
  });

  if (error) {
    console.error('❌ Erreur check_meeting_duration_limit:', error);
    throw error;
  }

  return data as MeetingDurationCheckResult;
}

/**
 * Récupère tous les quotas de l'utilisateur pour le mois en cours
 */
export async function getUserQuotas(userId: string) {
  const features = [
    { key: 'ai_tokens', name: 'Recherche IA', unit: 'tokens' },
    { key: 'meeting_count', name: 'Réunions', unit: 'réunions' },
    { key: 'meeting_minutes', name: 'Minutes de réunion', unit: 'min' },
    { key: 'summary_count', name: 'Résumés IA', unit: 'résumés' },
    { key: 'vocab_words', name: 'Mots vocabulaire', unit: 'mots' },
    { key: 'vocab_collections', name: 'Collections', unit: 'collections' },
    { key: 'notifications', name: 'Notifications', unit: 'envois' },
    { key: 'automations_active', name: 'Automations actives', unit: 'automations' }
  ];

  const quotaPromises = features.map(async (f) => {
    const { data } = await supabase.rpc('check_quota', {
      p_user_id: userId,
      p_feature: f.key,
      p_increment: 0 // Juste consultation
    });

    return {
      feature: f.key,
      displayName: f.name,
      unit: f.unit,
      ...data
    };
  });

  const results = await Promise.all(quotaPromises);
  return results;
}

/**
 * Récupère le plan de l'utilisateur
 */
export async function getUserPlan(userId: string) {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    // Si pas d'abonnement, retourner le plan Free
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'free')
      .single();

    return freePlan;
  }

  return data?.plan;
}

/**
 * Récupère tous les plans disponibles (pour affichage pricing)
 */
export async function getAvailablePlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    console.error('❌ Erreur getAvailablePlans:', error);
    throw error;
  }

  return data;
}

/**
 * Calcule le prix actuel d'un plan (avec ou sans promo)
 */
export function getPlanPrice(plan: any): number {
  if (!plan) return 0;

  // Vérifier si la promo est toujours active
  if (plan.promo_price_cents && plan.promo_end_date) {
    const now = new Date();
    const promoEnd = new Date(plan.promo_end_date);

    if (now < promoEnd) {
      return plan.promo_price_cents / 100; // Retourner prix promo en euros
    }
  }

  return plan.price_cents / 100; // Retourner prix normal en euros
}

/**
 * Retourne le pourcentage de réduction si promo active
 */
export function getPromoPercentage(plan: any): number | null {
  if (!plan || !plan.promo_price_cents || !plan.price_cents) return null;

  // Vérifier si la promo est toujours active
  if (plan.promo_end_date) {
    const now = new Date();
    const promoEnd = new Date(plan.promo_end_date);

    if (now < promoEnd) {
      const discount = ((plan.price_cents - plan.promo_price_cents) / plan.price_cents) * 100;
      return Math.round(discount);
    }
  }

  return null;
}

/**
 * Retourne le nombre de jours restants pour la promo
 */
export function getPromoDaysRemaining(plan: any): number | null {
  if (!plan || !plan.promo_end_date) return null;

  const now = new Date();
  const promoEnd = new Date(plan.promo_end_date);

  if (now < promoEnd) {
    const diffTime = promoEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  return null;
}
