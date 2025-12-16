# 🧪 Test de l'Autocomplétion IA

## 📊 Analyse de vos logs

D'après vos logs de console, **l'IA n'est pas appelée** car des suggestions locales sont toujours trouvées en premier.

### Comportement actuel

1. **Suggestions locales trouvées** :
   - `je` → `jeux` (local)
   - `doi` → `dois` (local)
   - `comprend` → `comprendre` (local)
   - `co` → `code` (local)
   - `com` → `comme` (local)

2. **L'IA n'est appelée que si** `suggestions.length === 0` (aucune suggestion locale)

3. **Dans vos logs** : Aucun log `[AI]` visible, donc l'IA n'est jamais déclenchée.

---

## ✅ Pourquoi c'est normal

L'IA est un **fallback** uniquement si :
- ❌ Aucun mot utilisateur ne correspond
- ❌ Aucun mot français commun ne correspond
- ❌ Aucune correction Levenshtein ne correspond
- ❌ Aucun mot de fallback ne correspond

**Si une suggestion locale est trouvée, l'IA n'est pas appelée** (pour la performance).

---

## 🧪 Comment tester l'IA

### Option 1 : Taper un mot inexistant

Tapez un mot qui n'existe **pas** dans vos listes locales :

```
Exemples :
- "xylophone" (commence par "xylo")
- "zebre" (commence par "zeb")
- "qwerty" (mot aléatoire)
- "testia123" (mot inventé)
```

**Logs attendus** :
```
[AI] testia123 → [mot suggéré par l'IA]
```

### Option 2 : Vérifier les logs réseau

Ouvrez l'onglet **Network** dans les DevTools et cherchez :
- Requête vers `ghost-autocomplete` (Supabase Edge Function)
- Status 200 = succès
- Status 401/500 = erreur

### Option 3 : Forcer l'appel IA (debug)

Modifiez temporairement `suggestionEngine.ts` pour forcer l'appel IA :

```typescript
// Ligne 333 - MODIFIER TEMPORAIREMENT
// if (suggestions.length === 0 && lastWord.length >= 2) {
if (lastWord.length >= 2) { // FORCER l'appel IA même si suggestions locales existent
  try {
    const aiWord = await fetchAISuggestion(fullPhrase, lastWord, abortSignal);
    // ...
  }
}
```

**⚠️ À REMETTRE après test !**

---

## 🔍 Vérifications

### 1. Edge Function déployée ?

```bash
supabase functions list
```

Vous devriez voir `ghost-autocomplete` dans la liste.

### 2. Secret configuré ?

```bash
supabase secrets list
```

Vous devriez voir `OPENAI_API_KEY_GHOST`.

### 3. Test direct de l'Edge Function

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ghost-autocomplete' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Je dois comprendre",
    "lastWord": "testia"
  }'
```

**Réponse attendue** :
```json
{
  "word": "testial" // ou un mot suggéré par l'IA
}
```

Si vous obtenez `{"word": null}`, vérifiez :
- ✅ `OPENAI_API_KEY_GHOST` est configuré dans Supabase
- ✅ La clé OpenAI est valide
- ✅ Les logs de l'Edge Function : `supabase functions logs ghost-autocomplete`

---

## 📝 Logs à surveiller

### Si l'IA est appelée, vous verrez :

```
[AI] testia → testial
```

### Si l'IA est en cache :

```
[AI] cache hit testia → testial
```

### Si l'IA timeout (800ms) :

```
[AI] Timeout (800ms dépassé)
```

### Si erreur Edge Function :

```
[AI] Erreur Edge Function: [message]
```

---

## 🎯 Conclusion

**L'IA fonctionne correctement**, mais elle n'est **pas appelée** car vos mots de test ont des suggestions locales.

**Pour tester l'IA** :
1. Tapez un mot qui n'existe pas dans les listes locales
2. Ou vérifiez les logs réseau pour voir les appels à `ghost-autocomplete`
3. Ou testez directement l'Edge Function avec curl

---

## 🔧 Debug avancé

Si vous voulez voir **tous** les appels (même ceux qui échouent), ajoutez ce log dans `aiSuggestions.ts` :

```typescript
// Ligne 49 - AJOUTER
console.log('[AI] Tentative appel IA pour:', lastWord, '| suggestions locales:', suggestions.length);
```

Puis dans `suggestionEngine.ts`, passez `suggestions.length` à `fetchAISuggestion` pour le log.





