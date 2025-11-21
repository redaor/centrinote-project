/**
 * 📦 Service d'Abonnement - Robuste avec Retry Exponentiel
 *
 * Gère les appels réseau pour les données d'abonnement avec:
 * - Timeout configurable
 * - Retry exponentiel (2 tentatives)
 * - AbortController pour annulation
 * - Mode dégradé si échec total
 */

import { supabase } from '../lib/supabase';

const DEBUG = import.meta.env.DEV;

export interface SubscriptionData {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  price_id: string;
  payment_method_brand?: string;
  payment_method_last4?: string;
}

interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch avec timeout et AbortController
 */
async function fetchWithTimeout<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fetchFn(controller.signal);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Charger l'abonnement depuis Supabase avec retry exponentiel
 */
export async function loadSubscription(userId: string): Promise<FetchResult<SubscriptionData | null>> {
  const MAX_ATTEMPTS = 2;
  const BASE_TIMEOUT = 5000;

  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_ATTEMPTS) {
    try {
      const timeout = BASE_TIMEOUT + (attempt * 3000);
      DEBUG && console.log(`[SubscriptionService] Tentative ${attempt + 1}/${MAX_ATTEMPTS} (timeout: ${timeout}ms)`);

      const data = await fetchWithTimeout(async (signal) => {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('subscription')
          .eq('id', userId)
          .abortSignal(signal as any)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        return profileData;
      }, timeout);

      if (data) {
        DEBUG && console.log('[SubscriptionService] ✅ Abonnement chargé:', data);

        if (data.subscription === 'free') {
          return { ok: true, data: null };
        }

        const mockSubscription: SubscriptionData = {
          id: 'sub_mock_' + userId,
          status: data.subscription === 'premium' ? 'active' : 'trialing',
          current_period_start: Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
          current_period_end: Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60,
          cancel_at_period_end: false,
          price_id: data.subscription || 'free',
          payment_method_brand: 'visa',
          payment_method_last4: '4242'
        };

        return { ok: true, data: mockSubscription };
      }

      return { ok: true, data: null };

    } catch (error: any) {
      lastError = error;

      if (error.name === 'AbortError') {
        DEBUG && console.warn(`[SubscriptionService] ⏱️ Timeout tentative ${attempt + 1}`);
      } else {
        DEBUG && console.error(`[SubscriptionService] ❌ Erreur tentative ${attempt + 1}:`, error);
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        const waitTime = 300 * Math.pow(2, attempt);
        DEBUG && console.log(`[SubscriptionService] ⏳ Attente ${waitTime}ms avant retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      attempt++;
    }
  }

  DEBUG && console.error('[SubscriptionService] 💥 Échec après 2 tentatives:', lastError);

  return {
    ok: false,
    error: lastError?.message || 'Impossible de charger les données d\'abonnement (timeout)'
  };
}

/**
 * Créer une session de portail client Stripe
 */
export async function createCustomerPortalSession(returnUrl: string): Promise<FetchResult<string>> {
  try {
    const { data, error } = await supabase.functions.invoke('create-customer-portal', {
      body: { returnUrl }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.url) {
      throw new Error('Aucune URL de portail reçue');
    }

    return { ok: true, data: data.url };

  } catch (error: any) {
    DEBUG && console.error('[SubscriptionService] Erreur portail client:', error);
    return {
      ok: false,
      error: error.message || 'Impossible d\'ouvrir le portail de gestion'
    };
  }
}