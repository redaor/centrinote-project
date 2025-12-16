# 🔐 Déploiement Supabase Edge Function - Ghost Autocomplete

## ✅ Objectif

**Aucune clé API exposée côté client** - La clé `OPENAI_API_KEY_GHOST` est stockée **uniquement dans Supabase**.

## 📋 Étapes de déploiement

### 1. Déployer la fonction Supabase

```bash
# Depuis la racine du projet
supabase functions deploy ghost-autocomplete
```

### 2. Configurer la variable d'environnement dans Supabase

**⚠️ IMPORTANT : Même en localhost, la clé doit être dans Supabase, pas dans `.env.local`**

**Option A : Production (Dashboard Supabase)**

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Project Settings** > **Edge Functions** > **Secrets**
4. Cliquez sur **Add new secret**
5. Ajoutez :
   - **Name**: `OPENAI_API_KEY_GHOST`
   - **Value**: `sk-proj-xxx...` (votre clé API OpenAI)
6. Cliquez sur **Save**

**Option B : Localhost (CLI Supabase)**

```bash
# Démarrer Supabase localement
supabase start

# Configurer le secret (même en localhost, pas dans .env.local)
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...
```

**Option C : Localhost (fichier `.env` Supabase)**

Si vous utilisez Supabase localement, vous pouvez aussi créer `supabase/.env` :

```bash
# supabase/.env (pas .env.local à la racine)
OPENAI_API_KEY_GHOST=sk-proj-xxx...
```

**⚠️ Ne jamais mettre la clé dans `.env.local` à la racine du projet, même pour tester.**

### 3. Vérifier le déploiement

**Tester localement :**
```bash
# Démarrer Supabase localement
supabase start

# Tester la fonction
curl -X POST http://localhost:54321/functions/v1/ghost-autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"context": "je test les", "lastWord": "autocom"}'
```

**Réponse attendue :**
```json
{"word": "autocomplétion"}
```

### 4. Vérifier que le code client utilise la fonction

Le fichier `src/features/ghost-text/services/aiSuggestions.ts` appelle maintenant :
```typescript
await supabase.functions.invoke('ghost-autocomplete', {
  body: { context, lastWord },
});
```

**Aucune clé API n'est présente dans le code client.**

## 🔍 Vérification

### ✅ Checklist

- [ ] Fonction déployée : `supabase functions list` doit afficher `ghost-autocomplete`
- [ ] Secret configuré : `supabase secrets list` doit afficher `OPENAI_API_KEY_GHOST`
- [ ] Code client modifié : `aiSuggestions.ts` utilise `supabase.functions.invoke()`
- [ ] Aucune clé dans `.env.local` : Supprimer `VITE_OPENAI_AUTO_COMPLETION` si présent
- [ ] Test fonctionnel : L'autocomplétion IA fonctionne dans l'application

## 🚨 Sécurité

### ✅ Ce qui est sécurisé maintenant

- ✅ Clé API stockée uniquement dans Supabase (jamais dans le code)
- ✅ Clé jamais exposée au client (pas dans le bundle JavaScript)
- ✅ Appel via Supabase Edge Function (authentification automatique)
- ✅ Timeout de 800ms (limite les coûts)

### ❌ À ne plus faire (même en localhost)

- ❌ **Ne pas mettre la clé dans `.env.local`** (même pour tester en localhost)
- ❌ **Ne pas mettre la clé dans `.env`** (même pour tester en localhost)
- ❌ **Ne pas appeler directement `api.openai.com` depuis le client** (même pour tester)

**⚠️ IMPORTANT :** Même en développement local, la clé doit être configurée dans Supabase (via `supabase secrets` ou le dashboard), **jamais dans les fichiers `.env`**.

## 📊 Architecture

```
Client (Browser)
    ↓
supabase.functions.invoke('ghost-autocomplete')
    ↓
Supabase Edge Function (Deno)
    ↓
api.openai.com (avec clé sécurisée)
    ↓
Réponse → Client
```

## 🔄 Migration depuis l'ancien système

Si vous aviez `VITE_OPENAI_AUTO_COMPLETION` dans `.env.local` :

1. **Supprimer** la variable de `.env.local` (même pour localhost)
2. **Ajouter** la clé dans Supabase :
   - **Production** : Dashboard Supabase > Edge Functions > Secrets
   - **Localhost** : `supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...` (après `supabase start`)
3. **Redémarrer** le serveur de développement
4. **Tester** l'autocomplétion

**⚠️ Même en localhost, utilisez Supabase pour stocker la clé, pas `.env.local`.**

## 🐛 Dépannage

### Erreur : "Function not found"
```bash
# Vérifier que la fonction est déployée
supabase functions list

# Redéployer si nécessaire
supabase functions deploy ghost-autocomplete
```

### Erreur : "OPENAI_API_KEY_GHOST not set"

**En localhost :**
```bash
# Vérifier que Supabase est démarré
supabase status

# Vérifier les secrets locaux
supabase secrets list

# Ajouter le secret (même en localhost, pas dans .env.local)
supabase secrets set OPENAI_API_KEY_GHOST=sk-proj-xxx...
```

**En production :**
- Vérifier dans le Dashboard Supabase > Edge Functions > Secrets
- Ajouter `OPENAI_API_KEY_GHOST` si manquant

**⚠️ Ne pas utiliser `.env.local` même pour tester en localhost.**

### Erreur : "401 Unauthorized"
- Vérifier que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurés
- Vérifier que l'utilisateur est authentifié (si RLS est activé)

## 📝 Notes

- La fonction utilise `text-davinci-003` (modèle de complétion)
- Timeout de 800ms pour éviter les latences
- Cache côté client (5 minutes) pour réduire les appels
- Les erreurs sont silencieuses (pas d'impact sur l'UI)





