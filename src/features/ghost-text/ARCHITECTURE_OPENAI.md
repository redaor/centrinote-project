# Architecture OpenAI - Explication

## 🔍 Qu'est-ce que `api.openai.com` ?

**`api.openai.com`** est l'**API REST officielle d'OpenAI** (pas une edge function).

C'est le **serveur HTTP d'OpenAI** qui expose ses services :
- `/v1/completions` - Modèles de complétion (text-davinci-003, etc.)
- `/v1/chat/completions` - Modèles de chat (gpt-4, gpt-3.5-turbo, etc.)
- `/v1/embeddings` - Génération d'embeddings
- `/v1/audio/transcriptions` - Transcription audio

## 📊 Architecture actuelle dans le projet

### ❌ **Problème actuel : Appel direct depuis le client**

Dans `src/features/ghost-text/services/aiSuggestions.ts` :
```typescript
const response = await fetch('https://api.openai.com/v1/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`, // ⚠️ Clé exposée côté client !
  },
  // ...
});
```

**Problèmes :**
1. 🔓 **Clé API exposée** dans le bundle JavaScript (visible par tous)
2. 💰 **Pas de contrôle des coûts** (quota, rate limiting)
3. 🚫 **Pas de validation** des requêtes
4. 📊 **Pas de logs/monitoring** centralisé

### ✅ **Meilleure pratique : Edge Function (proxy)**

Dans le projet, d'autres appels OpenAI utilisent déjà des **Netlify Edge Functions** :

**Exemple : `netlify/functions/ai-chat.ts`**
```typescript
// La clé est côté serveur (jamais exposée)
const apiKey = process.env.OPENAI_API_KEY;

// Appel depuis le serveur
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${apiKey}`, // ✅ Sécurisé côté serveur
  },
});
```

**Avantages :**
- 🔒 **Clé API sécurisée** (jamais exposée au client)
- 💰 **Contrôle des coûts** (rate limiting, quotas)
- ✅ **Validation** des requêtes
- 📊 **Logs/monitoring** centralisé
- 🚀 **Cache** possible côté serveur

## 🏗️ Architecture recommandée pour l'autocomplétion

### Option 1 : Edge Function Netlify (recommandé)

**Créer : `netlify/functions/ghost-autocomplete.ts`**

```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const { context, lastWord } = JSON.parse(event.body || '{}');
  
  const apiKey = process.env.OPENAI_AUTO_COMPLETION || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: `Phrase : "${context}"\nPropose UN SEUL mot qui complète naturellement "${lastWord}".`,
      max_tokens: 5,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify({ word: data.choices[0]?.text?.trim() }) };
};
```

**Modifier : `src/features/ghost-text/services/aiSuggestions.ts`**
```typescript
// Au lieu d'appeler directement OpenAI
const response = await fetch('/.netlify/functions/ghost-autocomplete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ context, lastWord }),
});
```

### Option 2 : Supabase Edge Function (si déjà utilisé)

**Créer : `supabase/functions/ghost-autocomplete/index.ts`**

Même principe, mais avec Supabase Edge Functions.

## 📋 Comparaison

| Aspect | Appel direct (actuel) | Edge Function (recommandé) |
|--------|----------------------|----------------------------|
| **Sécurité** | ❌ Clé exposée | ✅ Clé sécurisée |
| **Performance** | ✅ Direct | ⚠️ +1 hop réseau |
| **Coûts** | ❌ Pas de contrôle | ✅ Rate limiting |
| **Cache** | ❌ Client uniquement | ✅ Serveur + client |
| **Monitoring** | ❌ Difficile | ✅ Centralisé |

## 🎯 Recommandation

Pour l'autocomplétion ghost-text, **garder l'appel direct** est acceptable si :
- ✅ La clé est dans `.env.local` (pas versionnée)
- ✅ C'est un fallback (pas critique)
- ✅ Les requêtes sont limitées (timeout 800ms)
- ✅ Le cache client réduit les appels

**Mais idéalement**, migrer vers une Edge Function pour :
- 🔒 Sécurité maximale
- 💰 Contrôle des coûts
- 📊 Monitoring

## 🔄 Migration future (optionnel)

Si vous voulez migrer vers une Edge Function :

1. Créer `netlify/functions/ghost-autocomplete.ts`
2. Modifier `aiSuggestions.ts` pour appeler la fonction
3. Déplacer la clé dans les variables Netlify (production)
4. Ajouter rate limiting et cache

**Note :** Pour l'instant, l'appel direct fonctionne et est acceptable pour un fallback non-critique.

