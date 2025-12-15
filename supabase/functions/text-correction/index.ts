import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Clé API stockée uniquement dans Supabase (jamais exposée côté client)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY_GHOST');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { text, model = 'gpt-3.5-turbo', systemPrompt } = await req.json();

    if (!text || !OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing text or OpenAI API key not configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: text });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[text-correction] OpenAI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content || text;

    return new Response(
      JSON.stringify({ corrected }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[text-correction] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

