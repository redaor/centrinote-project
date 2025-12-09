import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_SEARCH_KEY = Deno.env.get('OPENAI_SEARCH_KEY');
const OPENAI_CHAT_KEY = Deno.env.get('OPENAI_CHAT_KEY');
const OPENAI_AIDE_KEY = Deno.env.get('OPENAI_AIDE_KEY');

const KEY_TO_SERVICE: Record<string, string> = {
  [OPENAI_SEARCH_KEY || '']: 'search',
  [OPENAI_CHAT_KEY || '']: 'chat',
  [OPENAI_AIDE_KEY || '']: 'aide',
};

const SYSTEM_PROMPTS: Record<string, string> = {
  search: 'Tu es un moteur de recherche sémantique pour les notes. Réponds brièvement avec les passages pertinents.',
  chat: 'Tu es un assistant conversationnel amical.',
  aide: 'Tu es un guide pas-à-pas. Explique simplement et structuré.',
};

function detectIntent(message: string): string {
  const lowerMsg = message.toLowerCase();
  if (/cherche|trouve|recherche/.test(lowerMsg)) return 'search';
  if (/aide|comment|tutorial/.test(lowerMsg)) return 'aide';
  return 'chat';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { message, apiKey } = await req.json();

    const service = KEY_TO_SERVICE[apiKey];
    if (!service) {
      return new Response(JSON.stringify({ error: 'Clé inconnue' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const intent = detectIntent(message);
    if (intent !== service) {
      return new Response(JSON.stringify({ error: 'Clé non autorisée pour cette intention' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
