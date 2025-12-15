# 🚀 Créer les Edge Functions Supabase - Guide Étape par Étape

## 📋 Prérequis

- CLI Supabase installé : `npm install -g supabase`
- Authentifié : `supabase login`
- Projet Supabase lié : `supabase link --project-ref votre-project-ref`

---

## 🔧 Étape 1 : Créer `ghost-autocomplete`

### Via CLI (Recommandé)

```bash
# Créer la fonction
supabase functions new ghost-autocomplete

# Le fichier sera créé dans : supabase/functions/ghost-autocomplete/index.ts
```

### Puis copier ce code dans `supabase/functions/ghost-autocomplete/index.ts` :

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

### Déployer :

```bash
supabase functions deploy ghost-autocomplete
```

---

## 🔧 Étape 2 : Créer `text-correction`

### Via CLI (Recommandé)

```bash
# Créer la fonction
supabase functions new text-correction

# Le fichier sera créé dans : supabase/functions/text-correction/index.ts
```

### Puis copier ce code dans `supabase/functions/text-correction/index.ts` :

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

### Déployer :

```bash
supabase functions deploy text-correction
```

---

## 🔧 Étape 3 : Modifier `noteo-orchestrator` (existe déjà)

Le fichier `supabase/functions/noteo-orchestrator/index.ts` existe déjà mais doit être modifié.

**Vérifier que le code actuel correspond à celui dans `SUPABASE_EDGE_FUNCTIONS_CODE.md` (section 3).**

Si ce n'est pas le cas, remplacer le contenu par le code de la section 3.

### Déployer :

```bash
supabase functions deploy noteo-orchestrator
```

---

## 🔐 Étape 4 : Configurer les Secrets dans Supabase

### Option A : Via CLI (Recommandé)

```bash
# Secrets pour ghost-autocomplete
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...

# Secrets pour text-correction
supabase secrets set OPENAI_API_KEY=sk-proj-xxx...

# Secrets pour noteo-orchestrator
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
supabase secrets set OPENAI_CHAT_KEY=sk-proj-xxx...
supabase secrets set OPENAI_AIDE_KEY=sk-proj-xxx...
```

### Option B : Via Dashboard Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
4. Cliquez sur **Add new secret** pour chaque variable :
   - `OPENAI_API_KEY_GHOST`
   - `OPENAI_API_KEY`
   - `OPENAI_SEARCH_KEY`
   - `OPENAI_CHAT_KEY`
   - `OPENAI_AIDE_KEY`

---

## ✅ Vérification

### Vérifier que les fonctions sont déployées :

```bash
supabase functions list
```

Vous devriez voir :
- ✅ `ghost-autocomplete`
- ✅ `text-correction`
- ✅ `noteo-orchestrator`

### Vérifier les secrets :

```bash
supabase secrets list
```

Vous devriez voir toutes les clés OpenAI configurées.

---

## 🧪 Test Local (Optionnel)

### Tester localement avant de déployer :

```bash
# Démarrer Supabase localement
supabase start

# Tester ghost-autocomplete
curl -X POST http://localhost:54321/functions/v1/ghost-autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"context": "je test les", "lastWord": "autocom"}'

# Tester text-correction
curl -X POST http://localhost:54321/functions/v1/text-correction \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"text": "Reformule ce texte", "systemPrompt": "Tu es un assistant..."}'
```

---

## 📝 Checklist Finale

- [ ] `ghost-autocomplete` créée et déployée
- [ ] `text-correction` créée et déployée
- [ ] `noteo-orchestrator` modifiée et déployée
- [ ] Tous les secrets configurés dans Supabase
- [ ] Tests fonctionnels effectués

---

## 🚨 En cas d'erreur

### Erreur : "Function not found"
```bash
# Vérifier que la fonction est bien créée
ls supabase/functions/ghost-autocomplete/index.ts
ls supabase/functions/text-correction/index.ts

# Redéployer
supabase functions deploy ghost-autocomplete
supabase functions deploy text-correction
```

### Erreur : "Secret not found"
```bash
# Vérifier les secrets
supabase secrets list

# Ajouter le secret manquant
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...
```

---

**✅ Une fois terminé, toutes les clés OpenAI seront sécurisées dans Supabase uniquement !**

