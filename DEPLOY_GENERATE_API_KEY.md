# 🚀 Déploiement de `generate-api-key` Edge Function

## ✅ Code créé

La fonction `supabase/functions/generate-api-key/index.ts` a été créée avec le code complet migré depuis la fonction Netlify.

---

## 🔧 Corrections apportées

### 1. **Crypto asynchrone**
- ❌ `crypto.subtle.digestSync()` n'existe pas dans Deno
- ✅ Utilisé `await crypto.subtle.digest()` (asynchrone)

### 2. **Génération de clés**
- Utilise `crypto.getRandomValues()` pour générer des bytes aléatoires
- Hash SHA-256 avec `crypto.subtle.digest()`

### 3. **Client Supabase**
- Utilise `createClient` avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Configuration requise

### 1. **Secrets Supabase**

Configurez les secrets suivants :

```bash
supabase secrets set MASTER_API_TOKEN=your-master-token-here
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note** : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont généralement déjà configurés automatiquement par Supabase, mais vous pouvez les vérifier.

---

## 🚀 Déploiement

### 1. **Déployer la fonction**

```bash
supabase functions deploy generate-api-key
```

### 2. **Vérifier le déploiement**

```bash
supabase functions list
```

Vous devriez voir `generate-api-key` dans la liste.

---

## 🧪 Test de la fonction

### 1. **Test GET (lister les clés)**

```bash
curl -X GET \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-api-key' \
  -H "Authorization: Bearer YOUR_MASTER_API_TOKEN" \
  -H "Content-Type: application/json"
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": [...],
  "count": 0
}
```

### 2. **Test POST (créer une clé)**

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-api-key' \
  -H "Authorization: Bearer YOUR_MASTER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "permissions": ["reports:write"],
    "expiresIn": 30
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "API key generated successfully",
  "data": {
    "id": "...",
    "name": "Test Key",
    "key": "cnt_live_...",
    "keyPreview": "cnt_live_...",
    "permissions": ["reports:write"],
    "expiresAt": "...",
    "createdAt": "...",
    "serverless": true
  },
  "warning": "Store this key securely. It will not be shown again."
}
```

---

## ❌ Erreurs courantes

### 1. **Erreur : `MASTER_API_TOKEN` manquant**

```
❌ Erreur: MASTER_API_TOKEN non configurée
```

**Solution** :
```bash
supabase secrets set MASTER_API_TOKEN=your-token
```

### 2. **Erreur : `SUPABASE_SERVICE_ROLE_KEY` manquant**

```
❌ Erreur: Failed to retrieve API keys
```

**Solution** :
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. **Erreur : Table `api_keys` n'existe pas**

```
❌ Erreur: relation "api_keys" does not exist
```

**Solution** : Créer la table `api_keys` dans Supabase :

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['reports:write'],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
```

### 4. **Erreur : CORS**

```
❌ Access to fetch blocked by CORS policy
```

**Solution** : Vérifier que l'origine est dans `allowedOrigins` ou utiliser `*` pour le développement.

### 5. **Erreur : `crypto.subtle.digestSync` is not a function**

**Solution** : ✅ **Déjà corrigé** - Utilise maintenant `await crypto.subtle.digest()`

---

## 🔍 Vérification des logs

### Voir les logs en temps réel

```bash
supabase functions logs generate-api-key --follow
```

### Voir les logs récents

```bash
supabase functions logs generate-api-key
```

---

## 📊 Comparaison Netlify vs Supabase

| Fonctionnalité | Netlify Function | Supabase Edge Function |
|----------------|------------------|------------------------|
| **Runtime** | Node.js | Deno |
| **Crypto** | `crypto.randomBytes()` | `crypto.getRandomValues()` |
| **Hash** | `crypto.createHash()` | `crypto.subtle.digest()` |
| **Client Supabase** | `require('@supabase/supabase-js')` | `import from 'esm.sh'` |
| **Variables env** | `process.env.*` | `Deno.env.get()` |
| **CORS** | Headers manuels | Headers manuels |

---

## ✅ Checklist de déploiement

- [ ] Code créé dans `supabase/functions/generate-api-key/index.ts`
- [ ] Secrets configurés (`MASTER_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Table `api_keys` créée dans Supabase
- [ ] Fonction déployée : `supabase functions deploy generate-api-key`
- [ ] Test GET réussi (lister les clés)
- [ ] Test POST réussi (créer une clé)
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🎯 Prochaines étapes

1. **Tester la fonction** avec les commandes curl ci-dessus
2. **Vérifier les logs** pour identifier les erreurs spécifiques
3. **Migrer les appels** depuis Netlify vers Supabase (si nécessaire)
4. **Supprimer la fonction Netlify** après migration réussie

---

## 📝 Note

Si vous rencontrez une erreur spécifique, partagez :
1. Le message d'erreur complet
2. Les logs de la fonction (`supabase functions logs generate-api-key`)
3. La requête que vous avez envoyée

