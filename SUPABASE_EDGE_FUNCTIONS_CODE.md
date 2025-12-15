# 🔧 Code des Edge Functions Supabase - Migration OpenAI

## 📋 Liste des Edge Functions

1. **`ghost-autocomplete`** - ✅ Déjà créée (autocomplétion ghost-text)
2. **`text-correction`** - ✅ Nouvelle (reformulations IA)
3. **`noteo-orchestrator`** - ⚠️ À modifier (ne plus lire apiKey du body)

---

## 1. `supabase/functions/ghost-autocomplete/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Clé API stockée uniquement dans Supabase (jamais exposée côté client)
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
```

**Secret Supabase requis :** `OPENAI_API_KEY_GHOST`

---

## 2. `supabase/functions/text-correction/index.ts` (NOUVELLE)

```typescript
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
```

**Secret Supabase requis :** `OPENAI_API_KEY` ou `OPENAI_API_KEY_GHOST`

---

## 3. `supabase/functions/noteo-orchestrator/index.ts` (MODIFIÉ)

```typescript
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
    // ⚠️ MODIFICATION : Ne plus lire apiKey du body, utiliser uniquement les variables d'environnement
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
      return new Response(
        JSON.stringify({ error: `Clé API manquante pour le service "${service}"` }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });
  } catch (error) {
    console.error('[noteo-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
```

**Secrets Supabase requis :**
- `OPENAI_SEARCH_KEY`
- `OPENAI_CHAT_KEY`
- `OPENAI_AIDE_KEY`

---

## 🚀 Commandes de Déploiement

### Créer et déployer les fonctions

```bash
# 1. Ghost autocomplete (déjà créée)
supabase functions deploy ghost-autocomplete

# 2. Text correction (nouvelle)
supabase functions new text-correction
# Puis copier le code ci-dessus dans supabase/functions/text-correction/index.ts
supabase functions deploy text-correction

# 3. Noteo orchestrator (modifier l'existante)
# Modifier supabase/functions/noteo-orchestrator/index.ts avec le code ci-dessus
supabase functions deploy noteo-orchestrator
```

### Configurer les secrets dans Supabase

```bash
# Via CLI
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...
supabase secrets set OPENAI_API_KEY=sk-proj-xxx...
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-xxx...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-xxx...

# Ou via Dashboard Supabase > Edge Functions > Secrets
```

---

## 📝 Structure des Réponses

### `ghost-autocomplete`
```json
{ "word": "autocomplétion" }
```

### `text-correction`
```json
{ "corrected": "Texte reformulé..." }
```

### `noteo-orchestrator`
```json
{ "reply": "Réponse de l'IA..." }
```

---

## ✅ Vérifications

1. ✅ Aucune clé API dans le code client
2. ✅ Toutes les clés dans Supabase uniquement
3. ✅ Tous les appels passent par `supabase.functions.invoke()`
4. ✅ Timeout et gestion d'erreurs implémentés

