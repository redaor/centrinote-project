# 🔍 Recherche IA - Edge Function

## ✅ Réponse : OUI, mais via `noteo-orchestrator`

La **recherche IA** utilise déjà la Edge Function `noteo-orchestrator` avec le service `'search'`.

---

## 📋 Architecture Actuelle

### Comment ça fonctionne :

1. **Page Recherche IA** (`AISearchPage.tsx`)
   - Utilise le composant `AIChat`
   - `AIChat` appelle `noteo-orchestrator` avec `service: 'chat'` ou détecte automatiquement

2. **Edge Function `noteo-orchestrator`**
   - Détecte l'intention : si le message contient "cherche", "trouve", "recherche" → service `'search'`
   - Utilise `OPENAI_SEARCH_KEY` (stockée dans Supabase uniquement)
   - Prompt système : "Tu es un moteur de recherche sémantique pour les notes..."

3. **Détection automatique** :
   ```typescript
   function detectIntent(message: string): string {
     const lowerMsg = message.toLowerCase();
     if (/cherche|trouve|recherche/.test(lowerMsg)) return 'search';
     if (/aide|comment|tutorial/.test(lowerMsg)) return 'aide';
     return 'chat';
   }
   ```

---

## ✅ Pas besoin de créer une nouvelle Edge Function

**La recherche IA est déjà gérée par `noteo-orchestrator` !**

- ✅ Service `'search'` → utilise `OPENAI_SEARCH_KEY`
- ✅ Service `'chat'` → utilise `OPENAI_CHAT_KEY`
- ✅ Service `'aide'` → utilise `OPENAI_AIDE_KEY`

---

## 🔐 Secret Supabase Requis

Pour la recherche IA, vous devez configurer :

```bash
supabase secrets set OPENAI_SEARCH_KEY=sk-proj-xxx...
```

---

## 📝 Utilisation dans le Code

### Dans `AIChat.tsx` :

```typescript
// Appel automatique via noteo-orchestrator
const { data, error } = await supabase.functions.invoke('noteo-orchestrator', {
  body: {
    message: "cherche mes notes sur React", // Détecte automatiquement 'search'
    service: 'chat', // Ou 'search' si explicitement demandé
  },
});
```

### Dans `useNoteoOrchestrator.ts` :

```typescript
// Peut spécifier explicitement le service
const { data } = await supabase.functions.invoke('noteo-orchestrator', {
  body: {
    message: "cherche mes notes",
    service: 'search', // Force le service search
  },
});
```

---

## 🎯 Résumé

| Fonctionnalité | Edge Function | Secret Supabase |
|----------------|---------------|-----------------|
| **Recherche IA** | `noteo-orchestrator` (service: 'search') | `OPENAI_SEARCH_KEY` |
| **Chat IA** | `noteo-orchestrator` (service: 'chat') | `OPENAI_CHAT_KEY` |
| **Aide IA** | `noteo-orchestrator` (service: 'aide') | `OPENAI_AIDE_KEY` |
| **Autocomplétion** | `ghost-autocomplete` | `OPENAI_API_KEY_GHOST` |
| **Correction texte** | `text-correction` | `OPENAI_API_KEY` |

---

## ✅ Conclusion

**Pas besoin de créer une Edge Function dédiée pour la recherche IA** - elle est déjà gérée par `noteo-orchestrator` avec le service `'search'`.

Il suffit de :
1. ✅ Déployer `noteo-orchestrator` (déjà fait)
2. ✅ Configurer `OPENAI_SEARCH_KEY` dans Supabase
3. ✅ Utiliser `service: 'search'` dans les appels

---

## 🔍 Vérification

Pour vérifier que la recherche IA fonctionne :

```bash
# Tester via curl
curl -X POST https://VOTRE_PROJECT_REF.supabase.co/functions/v1/noteo-orchestrator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -d '{"message": "cherche mes notes sur React", "service": "search"}'
```

**Réponse attendue :**
```json
{
  "reply": "Voici les notes pertinentes sur React..."
}
```

