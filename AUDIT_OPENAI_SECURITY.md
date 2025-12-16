# 🔍 AUDIT SÉCURITÉ OPENAI - Rapport Complet

**Date :** 2025-12-12  
**Objectif :** Vérifier que toutes les clés OpenAI passent par Supabase Edge Functions

---

## 📊 Tableau Récapitulatif

| Fichier | Ligne | Type | Appel/Variable | Statut | Action |
|---------|-------|------|----------------|--------|--------|
| `src/hooks/useTextCorrection.ts` | 372, 375 | appel | `import.meta.env.VITE_OPENAI_API_KEY` + `fetch('https://api.openai.com/v1/chat/completions')` | **B** ❌ | ⚠️ **À migrer** |
| `src/components/ai/AIChat.tsx` | 514 | variable | `import.meta.env.VITE_OPENAI_CHAT_KEY` (passé dans body) | **B** ❌ | ⚠️ **À migrer** |
| `src/hooks/useNoteoOrchestrator.ts` | 28-30, 64 | variable | `VITE_OPENAI_SEARCH_KEY`, `VITE_OPENAI_CHAT_KEY`, `VITE_OPENAI_AIDE_KEY` (passées dans body) | **B** ❌ | ⚠️ **À migrer** |
| `src/features/ghost-text/services/aiSuggestions.ts` | 60 | appel | `supabase.functions.invoke('ghost-autocomplete')` | **A** ✅ | ✅ **OK** |
| `src/vite-env.d.ts` | 5-7 | type | `VITE_OPENAI_AUTO_COMPLETION`, `OPENAI_AUTO_COMPLETION` (types seulement) | **A** ✅ | ✅ **OK** (types) |
| `supabase/functions/ghost-autocomplete/index.ts` | 3, 27 | env/appel | `Deno.env.get('OPENAI_API_KEY_GHOST')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/noteo-orchestrator/index.ts` | 3-5, 59 | env/appel | `Deno.env.get('OPENAI_*_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/ai-chat/index.ts` | 5, 325 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/chatbot-handler/index.ts` | 10, 319 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/ai-assistant/index.ts` | 4, 91 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/ai-memory/index.ts` | 4, 146 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/chat-memory/index.ts` | 32, 171 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/index-note/index.ts` | 16, 154 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/index-vocabulary/index.ts` | 26, 133 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `supabase/functions/transcribe-audio/index.ts` | 51, 79 | env/appel | `Deno.env.get('OPENAI_API_KEY')` + `fetch('api.openai.com')` | **C** ✅ | ✅ **OK** |
| `netlify/functions/ai-chat.ts` | 30 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/improve-content.ts` | 191 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/embed-notes.ts` | 10 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/embed-all-notes.ts` | 11 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/ask-enriched.ts` | 33 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/generate-summary.js` | 27 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/generate-summary-auto.js` | 35 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |
| `netlify/functions/transcribe-audio.ts` | 188 | env | `process.env.OPENAI_API_KEY` (Netlify Function) | **C** ⚠️ | ⚠️ **Migrer vers Supabase** |

---

## 🚨 PROBLÈMES CRITIQUES (Type B - Client-Unsafe)

### ❌ 1. `src/hooks/useTextCorrection.ts` (Lignes 372, 375)

**Problème :** Appel direct à `api.openai.com` avec clé exposée côté client

```typescript
const apiKey = aiApiKey || import.meta.env.VITE_OPENAI_API_KEY;
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${apiKey}`, // ❌ Clé exposée !
  },
});
```

**Action :** Créer une Supabase Edge Function `text-correction` et migrer l'appel.

---

### ❌ 2. `src/components/ai/AIChat.tsx` (Ligne 514)

**Problème :** Passe la clé API dans le body de la requête (exposée)

```typescript
body: JSON.stringify({
  message,
  apiKey: import.meta.env.VITE_OPENAI_CHAT_KEY || '', // ❌ Clé dans le body !
}),
```

**Action :** L'Edge Function `ai-chat` existe déjà, mais elle reçoit la clé dans le body. Modifier pour utiliser `Deno.env.get('OPENAI_API_KEY')` uniquement.

---

### ❌ 3. 


)

**Problème :** Passe les clés API dans le body de la requête (exposées)

```typescript
const keyMap = {
  search: import.meta.env.VITE_OPENAI_SEARCH_KEY, // ❌
  chat: import.meta.env.VITE_OPENAI_CHAT_KEY,     // ❌
  aide: import.meta.env.VITE_OPENAI_AIDE_KEY,     // ❌
};

body: JSON.stringify({
  message,
  apiKey, // ❌ Clé dans le body !
}),
```

**Action :** L'Edge Function `noteo-orchestrator` existe déjà et utilise `Deno.env.get()`. Supprimer le passage de clé dans le body côté client.

---

## ⚠️ PROBLÈMES MOYENS (Netlify Functions)

Les Netlify Functions utilisent `process.env.OPENAI_API_KEY` (sécurisé côté serveur), mais il serait préférable de migrer vers Supabase Edge Functions pour centraliser.

**Fichiers concernés :**
- `netlify/functions/ai-chat.ts`
- `netlify/functions/improve-content.ts`
- `netlify/functions/embed-notes.ts`
- `netlify/functions/embed-all-notes.ts`
- `netlify/functions/ask-enriched.ts`
- `netlify/functions/generate-summary.js`
- `netlify/functions/generate-summary-auto.js`
- `netlify/functions/transcribe-audio.ts`

**Action :** Migration optionnelle vers Supabase (pas critique car serveur-side).

---

## ✅ FICHIERS SÉCURISÉS

### Type A (Client-Safe via Supabase)
- ✅ `src/features/ghost-text/services/aiSuggestions.ts` - Utilise `supabase.functions.invoke()`

### Type C (Serveur-Safe dans Supabase Edge Functions)
- ✅ Tous les fichiers dans `supabase/functions/*/index.ts` utilisent `Deno.env.get('OPENAI_*')`

---

## 📋 ACTIONS REQUISES

### 🔴 PRIORITÉ HAUTE (Avant suppression variables Netlify)

1. **Migrer `useTextCorrection.ts`**
   - Créer `supabase/functions/text-correction/index.ts`
   - Modifier `useTextCorrection.ts` pour utiliser `supabase.functions.invoke()`

2. **Corriger `AIChat.tsx`**
   - Modifier `supabase/functions/ai-chat/index.ts` pour ignorer `apiKey` du body
   - Supprimer `apiKey: import.meta.env.VITE_OPENAI_CHAT_KEY` de `AIChat.tsx`

3. **Corriger `useNoteoOrchestrator.ts`**
   - Modifier `supabase/functions/noteo-orchestrator/index.ts` pour ignorer `apiKey` du body
   - Supprimer le passage de clés dans `useNoteoOrchestrator.ts`

### 🟡 PRIORITÉ MOYENNE (Optionnel)

4. **Migrer Netlify Functions vers Supabase** (si souhaité pour centralisation)

---

## 🚫 COMMANDES NETLIFY CLI (À NE PAS EXÉCUTER MAINTENANT)

**⚠️ ATTENTION :** Ne pas exécuter ces commandes tant que les migrations ne sont pas terminées.

```bash
# Variables à supprimer (APRÈS migrations)
netlify env:unset OPENAI_API_KEY
netlify env:unset VITE_OPENAI_API_KEY
netlify env:unset VITE_OPENAI_CHAT_KEY
netlify env:unset VITE_OPENAI_SEARCH_KEY
netlify env:unset VITE_OPENAI_AIDE_KEY
netlify env:unset VITE_OPENAI_AUTO_COMPLETION
```

---

## ✅ VÉRIFICATIONS FINALES (Après migrations)

- [ ] Aucune `VITE_OPENAI_*` dans le code client (`src/**/*.ts`, `src/**/*.tsx`)
- [ ] Aucun `sk-` en dur dans le code
- [ ] Aucun `api.openai.com` côté client (uniquement dans `supabase/functions/`)
- [ ] Tous les appels passent par `supabase.functions.invoke()` ou `*.supabase.co/functions/v1/`

---

## 📝 CONCLUSION

**Statut actuel :** ❌ **NON SÉCURISÉ** - 3 fichiers côté client utilisent des clés OpenAI exposées.

**Action immédiate :** Migrer les 3 fichiers critiques avant de supprimer les variables Netlify.

**Après migrations :** Toutes les clés seront dans Supabase uniquement, aucune exposition côté client.





