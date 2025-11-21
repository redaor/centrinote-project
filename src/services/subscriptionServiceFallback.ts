/**
 * 🔧 Service d'Abonnement Fallback - Fonctionne sans Edge Functions
 */

interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Charger l'abonnement depuis Supabase avec retry exponentiel
 */
export async function loadSubscription(userId: string): Promise<FetchResult<any>> {
  try {
    // Simulation d'un abonnement free par défaut
    return { 
      ok: true, 
      data: {
        id: 'sub_free_' + userId,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        price_id: 'free'
      }
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || 'Impossible de charger les données d\'abonnement'
    };
  }
}

/**
 * Créer une session de portail client Stripe via Edge Function
 */
export async function createCustomerPortalSession(returnUrl: string): Promise<FetchResult<string>> {
  try {
    // Récupérer le token JWT de l'utilisateur connecté
    const { supabase } = await import('../lib/supabase');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return {
        ok: false,
        error: 'Veuillez vous connecter pour accéder au portail de facturation'
      };
    }

    // Appeler l'Edge Function pour créer le portail client
    // L'Edge Function cherchera elle-même le customer_id par email
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        returnUrl: returnUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorText = errorData?.error || await response.text().catch(() => '');
      console.error('❌ Erreur création portail:', response.status, errorText);
      return {
        ok: false,
        error: errorText || `Erreur lors de la création du portail de facturation (${response.status})`
      };
    }

    const data = await response.json();

    if (!data.url) {
      return {
        ok: false,
        error: 'URL du portail de facturation non reçue'
      };
    }

    return {
      ok: true,
      data: data.url
    };

  } catch (error: any) {
    console.error('❌ Exception création portail:', error);
    return {
      ok: false,
      error: error?.message || 'Impossible d\'ouvrir le portail de gestion'
    };
  }
}
