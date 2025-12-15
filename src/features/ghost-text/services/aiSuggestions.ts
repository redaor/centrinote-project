/**
 * Service de suggestions IA pour le ghost-text
 * Utilise Supabase Edge Function (clé API stockée uniquement dans Supabase)
 */

import { supabase } from '../../../lib/supabase';

const AI_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const AI_CACHE = new Map<string, { word: string; timestamp: number }>();

/**
 * Nettoie le cache IA (max 100 entrées)
 */
function cleanAICache() {
  if (AI_CACHE.size <= 100) return;

  const entries = Array.from(AI_CACHE.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, entries.length - 100);
  toRemove.forEach(([key]) => AI_CACHE.delete(key));
}

/**
 * Récupère une suggestion IA pour compléter un mot via Supabase Edge Function
 * La clé API est stockée uniquement dans Supabase (jamais exposée côté client)
 * @param context - Phrase complète (contexte)
 * @param lastWord - Mot en cours de frappe
 * @param signal - AbortSignal pour annuler la requête
 * @returns Mot suggéré ou null
 */
export async function fetchAISuggestion(
  context: string,
  lastWord: string,
  signal?: AbortSignal
): Promise<string | null> {
  if (!lastWord || lastWord.length < 2) {
    return null;
  }

  // Vérifier le cache
  const cacheKey = `ai-${lastWord.toLowerCase()}-${context.slice(-50).toLowerCase()}`;
  const cached = AI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_DURATION) {
    console.log('[AI] cache hit', lastWord, '→', cached.word);
    return cached.word;
  }

  try {
    // Timeout de 120ms max (optimisé pour smart-complete)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    // Appeler la Supabase Edge Function smart-complete (optimisée, 120ms timeout)
    // La clé API est stockée uniquement dans Supabase (variable OPENAI_SMART_KEY)
    const { data, error } = await supabase.functions.invoke('smart-complete', {
      body: { context, lastWord },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) {
      // Ne pas logger les erreurs en production (sécurité)
      if (import.meta.env.DEV) {
        console.warn('[AI] Erreur Edge Function:', error.message);
      }
      return null;
    }

    const aiWord = data?.word || null;

    if (aiWord && aiWord !== lastWord.toLowerCase()) {
      // Mettre en cache
      AI_CACHE.set(cacheKey, {
        word: aiWord,
        timestamp: Date.now(),
      });
      cleanAICache();

      if (import.meta.env.DEV) {
        console.log('[AI]', lastWord, '→', aiWord);
      }

      return aiWord;
    }

    return null;
  } catch (error: any) {
    // Ignorer les erreurs d'abort (timeout normal)
    if (error.name === 'AbortError') {
      // Ne pas logger en production
      if (import.meta.env.DEV) {
        console.log('[AI] Timeout (120ms dépassé)');
      }
      return null;
    }

    // Ne logger les erreurs qu'en développement
    if (import.meta.env.DEV) {
      console.warn('[AI] Erreur:', error.message);
    }
    return null;
  }
}

