import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY_GHOST');
const MAX_PER_MIN = 30;
const CACHE_TTL = 300; // 5 min

// Cache simple en mémoire (pour développement)
// En production, utiliser Redis/Upstash pour un cache distribué
const memoryCache = new Map<string, { word: string; timestamp: number }>();

// Rate limiting simple (en production, utiliser un service dédié)
const rateLimit = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter((time) => now - time < 60000); // Dernière minute
  
  if (recentRequests.length >= MAX_PER_MIN) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}

function getCached(key: string): string | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL * 1000) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.word;
}

function setCache(key: string, word: string): void {
  memoryCache.set(key, { word, timestamp: Date.now() });
  
  // Nettoyer le cache si trop grand (max 1000 entrées)
  if (memoryCache.size > 1000) {
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - 1000);
    toRemove.forEach(([key]) => memoryCache.delete(key));
  }
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://centrinote.fr',
  'https://www.centrinote.fr',
]);

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  // Gérer OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  const { context = '', lastWord = '' } = await req.json();
  
  if (!lastWord || lastWord.length < 2 || !OPENAI_KEY) {
    return new Response(
      JSON.stringify({ word: null }),
      { headers: corsHeaders, status: 200 }
    );
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ word: null, error: 'Rate limit exceeded' }),
      { headers: corsHeaders, status: 429 }
    );
  }

  // Vérifier le cache
  const cacheKey = `smart:${lastWord.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(
      JSON.stringify({ word: cached }),
      { headers: corsHeaders, status: 200 }
    );
  }

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 120); // Timeout 120ms
    
    const prompt = `Phrase: "${context}"\nSuite: "${lastWord}"→`;
    
    const res = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 1,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const word = data.choices?.[0]?.text?.trim().toLowerCase() || null;

    if (word) {
      setCache(cacheKey, word);
    }

    return new Response(
      JSON.stringify({ word }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (e: any) {
    // Ignorer les erreurs d'abort (timeout normal)
    if (e.name === 'AbortError') {
      console.log('[SMART] Timeout (120ms dépassé)');
      return new Response(
        JSON.stringify({ word: null }),
        { headers: corsHeaders, status: 200 }
      );
    }

    console.error('[SMART]', e);
    return new Response(
      JSON.stringify({ word: null }),
      { headers: corsHeaders, status: 200 }
    );
  }
});

