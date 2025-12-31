import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Clés API stockées uniquement dans Supabase (jamais exposées côté client)
const OPENAI_SEARCH_KEY = Deno.env.get('OPENAI_SEARCH_KEY');
const OPENAI_CHAT_KEY = Deno.env.get('OPENAI_CHAT_KEY');
const OPENAI_AIDE_KEY = Deno.env.get('OPENAI_AIDE_KEY');

const SYSTEM_PROMPTS: Record<string, string> = {
  search: 'Tu es un moteur de recherche sémantique pour les notes. Réponds brièvement avec les passages pertinents.',
  chat: 'Tu es un assistant conversationnel amical.',
  aide: 'Tu es un guide pas-à-pas. Explique simplement et structuré.',
};

// Liste des origines autorisées (localhost + production)
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://centrinote.fr",
  "https://www.centrinote.fr"
]);

// Fonction pour construire les headers CORS
function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}

function detectIntent(message: string): string {
  const lowerMsg = message.toLowerCase();
  if (/cherche|trouve|recherche/.test(lowerMsg)) return 'search';
  if (/aide|comment|tutorial/.test(lowerMsg)) return 'aide';
  return 'chat';
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { message, service: requestedService } = await req.json();

    // Détecter l'intention ou utiliser le service demandé
    const intent = detectIntent(message);
    const service = requestedService || intent;

    // Récupérer la clé API depuis les variables d'environnement Supabase (jamais depuis le body)
    const keyMap: Record<string, string | undefined> = {
      search: OPENAI_SEARCH_KEY,
      chat: OPENAI_CHAT_KEY,
      aide: OPENAI_AIDE_KEY,
    };

    const apiKey = keyMap[service];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Clé API manquante pour le service "${service}"` }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[service] },
          { role: 'user', content: message },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur OpenAI' }));
      return new Response(
        JSON.stringify({ error: errorData.error || `Erreur ${response.status}` }),
        {
          status: response.status,
          headers: corsHeaders,
        }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[noteo-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
