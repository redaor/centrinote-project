// =====================================================
// Quote Service - Service client pour récupérer les citations
// Isolation totale du système existant
// =====================================================

import { supabaseClient } from './supabaseClient';

export interface Quote {
  id: string;
  quote: string;
  author: string | null;
  category: string;
  language: string;
  used_at: string | null;
  created_at: string;
}

/**
 * Récupère une citation du jour non utilisée aujourd'hui
 * @param lang Langue de la citation (défaut: 'fr')
 * @param category Catégorie de la citation (défaut: 'motivation')
 * @returns Promise<Quote>
 */
export async function fetchDailyQuote(
  lang: string = 'fr',
  category: string = 'motivation'
): Promise<Quote> {
  try {
    // Appel direct à la fonction SQL (plus rapide que via Edge Function)
    const { data, error } = await supabaseClient.rpc('get_today_quote', {
      lang,
      cat: category,
    });

    if (error) {
      console.error('❌ Error fetching daily quote:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No quote found');
    }

    return data as Quote;
  } catch (error) {
    console.error('❌ Error in fetchDailyQuote:', error);
    // Fallback : essayer via Edge Function si RPC échoue
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/get-daily-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ lang, category }),
      });

      if (!response.ok) {
        throw new Error(`Edge Function returned ${response.status}`);
      }

      const quote = await response.json();
      return quote as Quote;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      throw error;
    }
  }
}

/**
 * Cache simple en mémoire (optionnel, pour éviter les appels répétés)
 */
let cachedQuote: { quote: Quote; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 heure

export async function fetchDailyQuoteCached(
  lang: string = 'fr',
  category: string = 'motivation'
): Promise<Quote> {
  const now = Date.now();

  // Vérifier le cache
  if (cachedQuote && (now - cachedQuote.timestamp) < CACHE_DURATION) {
    return cachedQuote.quote;
  }

  // Récupérer une nouvelle citation
  const quote = await fetchDailyQuote(lang, category);
  cachedQuote = { quote, timestamp: now };

  return quote;
}

