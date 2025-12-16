import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY_GHOST');
const MAX_TOKENS = 5;
const TIMEOUT_MS = 800;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { context = '', lastWord = '' } = await req.json();
  
  if (!lastWord || lastWord.length < 2 || !OPENAI_API_KEY) {
    return new Response(JSON.stringify({ word: null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), TIMEOUT_MS);

    const prompt = `Phrase : "${context}"\nPropose UN SEUL mot français qui complète naturellement "${lastWord}".\nRéponse : uniquement le mot (minuscule, sans ponctuation).`;

    const openaiRes = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        stop: [' ', '\n'],
      }),
      signal: controller.signal,
    });

    if (!openaiRes.ok) {
      throw new Error(`OpenAI error: ${openaiRes.status} ${openaiRes.statusText}`);
    }

    const data = await openaiRes.json();
    const word = data.choices?.[0]?.text?.trim().toLowerCase() || null;

    return new Response(JSON.stringify({ word }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[SUPA-EDGE] ghost-autocomplete error:', e);
    return new Response(JSON.stringify({ word: null }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});





