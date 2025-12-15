# Intégration IA - Suggestions contextuelles

## Configuration requise

### 1. Ajouter la clé API OpenAI pour l'autocomplétion

**⚠️ IMPORTANT : Cette variable est SÉPARÉE des autres clés API OpenAI**

**En localhost (`.env.local`) :**
```bash
VITE_OPENAI_AUTO_COMPLETION=sk-xxx
```

**En production (Netlify/Vercel/etc.) :**
```bash
OPENAI_AUTO_COMPLETION=sk-xxx
```

**Note :** 
- Le fichier `.env.local` n'est pas versionné (déjà dans `.gitignore`)
- En production, la variable `OPENAI_AUTO_COMPLETION` (sans préfixe `VITE_`) doit être configurée dans l'environnement du serveur
- Cette variable est **exclusivement** utilisée pour l'autocomplétion ghost-text
- Si `OPENAI_AUTO_COMPLETION` n'est pas disponible en production, le système essaiera `VITE_OPENAI_AUTO_COMPLETION` en fallback

### 2. Types TypeScript

Les types sont déjà ajoutés dans `src/vite-env.d.ts` :

```typescript
interface ImportMetaEnv {
  // Localhost uniquement
  readonly VITE_OPENAI_AUTO_COMPLETION?: string;
  // Production uniquement (peut nécessiter une configuration spéciale du build)
  readonly OPENAI_AUTO_COMPLETION?: string;
}
```

**Note technique :** En Vite, seules les variables avec le préfixe `VITE_` sont exposées côté client par défaut. Pour utiliser `OPENAI_AUTO_COMPLETION` en production, vous devrez peut-être :
- Configurer votre plateforme de déploiement pour injecter cette variable
- Utiliser un proxy backend qui expose cette variable
- Ou utiliser `VITE_OPENAI_AUTO_COMPLETION` également en production

## Architecture

### Fichiers créés/modifiés

1. **`src/features/ghost-text/services/aiSuggestions.ts`** (nouveau)
   - Fonction `fetchAISuggestion()` qui appelle OpenAI
   - Cache LRU (max 100 entrées, TTL 5 min)
   - Timeout 800ms max avec AbortSignal

2. **`src/features/ghost-text/services/suggestionEngine.ts`** (modifié)
   - Import de `fetchAISuggestion`
   - Ajout du paramètre `abortSignal?: AbortSignal` à `generateCompletions()`
   - Fallback IA après les suggestions locales (étape 6)

3. **`src/features/ghost-text/hooks/useGhostAutocomplete.ts`** (modifié)
   - Gestion d'AbortController pour annuler les requêtes
   - Passe le signal à `generateCompletions()`

## Ordre de priorité des suggestions

1. **Suggestions utilisateur** (mots de ses notes)
2. **Suggestions locales** (mots français courants, 500 mots)
3. **Corrections Levenshtein** (distance ≤ 2)
4. **Fallback local** (liste de 200 mots ultra-courants)
5. **Fallback IA** (OpenAI) ← **NOUVEAU**

## Performance

- **Suggestions locales** : < 30ms (objectif)
- **Fallback IA** : < 800ms (timeout max)
- **Cache IA** : 5 minutes, max 100 entrées

## Logs console

- `[AI] cache hit` : suggestion IA trouvée dans le cache
- `[AI] lastWord → aiWord` : suggestion IA générée
- `[AI] Timeout (800ms dépassé)` : requête IA annulée (silencieux)
- `[AI] erreur` : erreur API (silencieux, pas d'impact UI)

## Tests

- Taper « je croix ca de » → ghost « mande » (IA)
- Taper « je croix ca der » → ghost « nier » (IA)
- Taper « je suis entrain de pr » → ghost « ogrammer » (IA)

## Sécurité

- La clé API est côté client (exposée dans le bundle)
- Pour la production, envisager un proxy backend qui cache les requêtes
- Le timeout de 800ms limite l'exposition en cas de problème réseau

