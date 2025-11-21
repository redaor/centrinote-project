// src/services/ai-enrich.ts
// Service client-side pour appeler l'API d'enrichissement automatique

import { supabase } from '../lib/supabase';

export interface AIEnrichResponse {
  success: boolean;
  response?: string;
  error?: string;
  metadata?: {
    duration_ms: number;
    enrichment_used: boolean;
    notes_count: number;
    vocabulary_count: number;
    model: string;
  };
}

/**
 * Envoie une question à l'IA enrichie avec les notes et vocabulaire utilisateur
 */
export async function askEnrichedAI(question: string): Promise<AIEnrichResponse> {
  try {
    // Récupérer le token JWT depuis Supabase
    // Essayer getSession() plusieurs fois avec un petit délai si nécessaire
    let accessToken: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!accessToken && attempts < maxAttempts) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn(`[ai-enrich] Tentative ${attempts + 1}: Erreur session:`, sessionError.message);
      } else if (session?.access_token) {
        accessToken = session.access_token;
        break;
      }

      attempts++;
      if (attempts < maxAttempts) {
        // Attendre un peu avant de réessayer (la session peut être en cours de chargement)
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Si toujours pas de token, essayer getUser() qui force un refresh
    if (!accessToken) {
      console.log('[ai-enrich] getSession() a échoué, tentative avec getUser()...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[ai-enrich] Erreur getUser():', userError);
      } else if (user) {
        // Réessayer getSession() après getUser()
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession?.access_token) {
          accessToken = finalSession.access_token;
        }
      }
    }

    if (!accessToken) {
      console.error('[ai-enrich] Impossible de récupérer le token après', maxAttempts, 'tentatives');
      return {
        success: false,
        error: 'Non authentifié. Veuillez vous reconnecter ou rafraîchir la page.',
      };
    }

    // Déterminer l'URL de l'API (dev vs prod)
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:8888/.netlify/functions/ask-enriched'
      : '/.netlify/functions/ask-enriched';

    // Appeler l'endpoint enrichi
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ question: question.trim() }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }

      console.error('[ai-enrich] Erreur API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        url: apiUrl,
      });

      // Si 404, la fonction n'est peut-être pas déployée
      if (response.status === 404) {
        return {
          success: false,
          error: 'Fonction d\'enrichissement non disponible. Vérifiez le déploiement Netlify.',
        };
      }

      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ai-enrich] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

/**
 * Vérifie si le service d'enrichissement est disponible
 */
export async function checkEnrichmentAvailable(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return false;
    }

    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:8888/.netlify/functions/ask-enriched'
      : '/.netlify/functions/ask-enriched';

    // Test avec une question simple
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ question: 'test' }),
    });

    return response.status !== 404 && response.status !== 500;
  } catch (error) {
    return false;
  }
}

