# 🔵 Setup Intégration Zoom Centrinote - Guide Final

## 📋 Variables d'environnement requises

### 1. **Netlify (Frontend)**
```bash
# Variables publiques (déjà configurées)
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ZOOM_CLIENT_ID=XjtK5_JvQ7upfjYppAF1tw
VITE_ZOOM_REDIRECT_URI=https://centrinote.fr/zoom/callback
```

### 2. **Supabase Secrets (Edge Functions)**
```bash
# Commandes à exécuter :
supabase secrets set N8N_ZOOM_OAUTH_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/a27e69d1-9497-4816-adba-3dc85dd83f75
supabase secrets set N8N_PING_SECRET=your-strong-secret-here
```

### 3. **Variables locales (.env)**
```bash
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ZOOM_CLIENT_ID=XjtK5_JvQ7upfjYppAF1tw
VITE_ZOOM_REDIRECT_URI=https://centrinote.fr/zoom/callback
```

## 🚀 Déploiement Edge Functions

### 1. **Déployer les fonctions**
```bash
# Fonction principale OAuth
supabase functions deploy exchange-zoom-code

# Fonction de test N8N
supabase functions deploy ping-n8n
```

### 2. **Vérifier les déploiements**
```bash
# Lister les fonctions
supabase functions list

# Voir les secrets
supabase secrets list

# Logs temps réel
supabase functions logs exchange-zoom-code --follow
supabase functions logs ping-n8n --follow
```

## 📊 Base de données

### 1. **Appliquer le schéma**
```bash
# Depuis le fichier SQL
supabase db push

# Ou directement
psql -d postgres -f zoom_tokens_schema.sql
```

### 2. **Vérification**
```sql
-- Vérifier la table
SELECT * FROM zoom_tokens LIMIT 1;

-- Tester les politiques RLS
SELECT user_has_valid_zoom_token();
```

## 🔧 Configuration N8N

### 1. **Dans le workflow Zoom OAuth**
- **Node "Save Token to Supabase"** :
  - ❌ **SUPPRIMER** le champ `created_at`
  - ✅ **GARDER** : `user_id`, `access_token`, `refresh_token`, `expires_at`

### 2. **Ajouter gestion du ping**
```javascript
// Au début du workflow, ajouter un node IF :
// Si query.ping === "1" ET header x-n8n-ping-secret match
if (query.ping === "1" && headers["x-n8n-ping-secret"] === "YOUR_SECRET") {
  return { ok: true };
}
// Sinon continuer le flux OAuth normal
```

## 🎯 Test de fonctionnement

### 1. **Page /zoom**
- ✅ Badge d'état visible en haut
- ✅ Bouton "Tester la connexion N8N" fonctionnel
- ✅ Status refresh automatique si `?connected=1`

### 2. **Flow OAuth complet**
1. Clic "Connecter à Zoom" → redirection même onglet
2. Autorisation Zoom → retour sur `/zoom/callback`
3. Validation state → appel Edge Function
4. Edge Function → appel N8N webhook
5. N8N → insertion tokens en DB
6. Redirection → `/zoom?connected=1`
7. Badge passe au vert automatiquement

### 3. **Test de connectivité N8N**
```bash
# Test direct Edge Function
curl -X POST https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/ping-n8n \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key"
```

## 🎨 Interface utilisateur

### 1. **Badge de statut** (ZoomConnectionStatus)
- 🟢 **Vert** : "Connecté à Zoom" (token valide)
- 🟠 **Orange** : "Connexion expirée" (token expiré)
- 🔴 **Rouge** : "Non connecté" (pas de token)

### 2. **Test N8N intégré**
- Bouton "🏓 Tester la connexion N8N"
- Résultat : "Webhook N8N OK ✅" ou message d'erreur
- Désactivation pendant le test

## 🔍 Debugging

### 1. **Logs à surveiller**
```javascript
// Frontend
console.log('🔐 State généré:', state);
console.log('📡 Response status:', response.status);

// Edge Function
console.log('🚀 Envoi vers N8N...');
console.log('✅ Ping N8N réussi');

// N8N
// Vérifier les logs d'exécution du workflow
```

### 2. **Vérifications DB**
```sql
-- Tokens de l'utilisateur connecté
SELECT * FROM zoom_tokens WHERE user_id = auth.uid();

-- Nettoyer tokens expirés
SELECT clean_expired_zoom_tokens();

-- Statut global
SELECT * FROM zoom_tokens_status;
```

## 📝 Critères d'acceptation

- ✅ Badge d'état coloré selon le statut de connexion
- ✅ Test N8N intégré avec retour visuel
- ✅ Redirection `?connected=1` refresh automatique
- ✅ Aucune erreur 406 grâce à `.maybeSingle()`
- ✅ Secrets N8N cachés du frontend
- ✅ Flux OAuth complet fonctionnel
- ✅ Logs de debug clairs à chaque étape

## 🚨 Commandes de maintenance

```bash
# Renouveler les secrets
supabase secrets set N8N_PING_SECRET=new-secret

# Nettoyer la DB
supabase db reset

# Re-déployer une fonction
supabase functions deploy exchange-zoom-code --no-verify-jwt

# Debug connexion
curl -v https://n8n.srv886297.hstgr.cloud/webhook/...?ping=1
```

**L'intégration Zoom est maintenant complète avec monitoring, tests et interface utilisateur robuste !** 🎉