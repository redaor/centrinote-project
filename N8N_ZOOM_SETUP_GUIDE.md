# Guide Configuration N8N - Intégration Zoom Simplifiée

## 🎯 Objectif

Configuration complète de N8N pour gérer l'authentification OAuth Zoom et la création de réunions via une architecture simplifiée : **Centrinote → n8n → Zoom API → Supabase**.

## 📋 Prérequis

1. **N8N Instance** : https://n8n.srv886297.hstgr.cloud
2. **Supabase Database** : wjzlicokhxitmeoxkjzv.supabase.co
3. **Zoom App OAuth** : Client ID + Client Secret
4. **Table `zoom_tokens`** créée dans Supabase

## 🔧 Configuration N8N

### 1. Credentials à Créer

#### A. **Zoom OAuth Credentials**
- **Nom** : `zoom-oauth-credentials`
- **Type** : `HTTP Basic Auth`
- **Username** : `gRUJc8RvTgqjYZb1op3gNQ` (Zoom Client ID)
- **Password** : `eP8pbyKRyZrHMekAIRwL3iEfW0qLiyOL` (Zoom Client Secret)

#### B. **Supabase Database**
- **Nom** : `supabase-db`
- **Type** : `PostgreSQL`
- **Host** : `aws-0-eu-central-1.pooler.supabase.com`
- **Port** : `6543`
- **Database** : `postgres`
- **Username** : `postgres.wjzlicokhxitmeoxkjzv`
- **Password** : `CentriNote2025`
- **SSL** : `require`

### 2. Workflows à Importer

#### A. **Workflow OAuth Callback**
```bash
# Importer le fichier : n8n-workflows/zoom-oauth-callback.json
# URL Webhook : https://n8n.srv886297.hstgr.cloud/webhook/zoom-oauth-callback
```

**Fonctionnalités** :
- Échange code OAuth → tokens Zoom
- Stockage sécurisé dans `zoom_tokens`
- Refresh automatique des tokens expirés
- Retour JSON structuré vers frontend

#### B. **Workflow Création Réunion**
```bash
# Importer le fichier : n8n-workflows/zoom-create-meeting.json  
# URL Webhook : https://n8n.srv886297.hstgr.cloud/webhook/zoom-create-meeting
```

**Fonctionnalités** :
- Récupération token utilisateur depuis DB
- Vérification expiration + refresh si nécessaire
- Création réunion via API Zoom
- Stockage meeting dans `zoom_meetings`
- Retour données complètes (join_url, start_url, etc.)

## 🔄 Flux de Données

### **OAuth Authentication Flow**
```
1. User → Zoom OAuth → Code d'autorisation
2. Frontend → n8n webhook zoom-oauth-callback
3. n8n → Zoom API (échange code → tokens)
4. n8n → Supabase (stockage zoom_tokens)
5. n8n → Frontend (confirmation success)
```

### **Meeting Creation Flow**
```
1. Frontend → n8n webhook zoom-create-meeting
2. n8n → Supabase (récupération token utilisateur)
3. n8n → Zoom API (refresh token si expiré)
4. n8n → Zoom API (création meeting)
5. n8n → Supabase (stockage meeting)
6. n8n → Frontend (retour meeting data)
```

## 📊 Structure des Requêtes

### **OAuth Callback Request**
```json
POST /webhook/zoom-oauth-callback
{
  "type": "oauth_callback",
  "code": "ZOOM_OAUTH_CODE",
  "user_id": "supabase_user_uuid",
  "redirect_uri": "https://centrinote.com/zoom-callback"
}
```

### **Meeting Creation Request**
```json
POST /webhook/zoom-create-meeting
{
  "user_id": "supabase_user_uuid",
  "topic": "Ma Réunion Test",
  "duration": 60,
  "password": "optionnel",
  "agenda": "optionnel",
  "settings": {
    "host_video": true,
    "participant_video": true,
    "join_before_host": false,
    "mute_upon_entry": false,
    "auto_recording": "none"
  }
}
```

### **Refresh Token Request**
```json
POST /webhook/zoom-oauth-callback
{
  "type": "refresh_token",
  "user_id": "supabase_user_uuid"
}
```

## 🎛️ Configuration Zoom App

### **Redirect URIs** (Zoom Developer Console)
```
https://centrinote.com/zoom-callback
https://localhost:5173/zoom-callback
https://your-domain.com/zoom-callback
```

### **Scopes Required**
```
meeting:write
meeting:read
user:read
```

### **App Type**
- **OAuth App** (pas Server-to-Server)
- **User-managed** pour tokens par utilisateur

## 🗄️ Structure Base de Données

### **Table `zoom_tokens`**
```sql
CREATE TABLE zoom_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_zoom_tokens_expires_at ON zoom_tokens(expires_at);
CREATE INDEX idx_zoom_tokens_user_id ON zoom_tokens(user_id);
```

### **Table `zoom_meetings`** (optionnelle, pour historique)
```sql
CREATE TABLE zoom_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    meeting_id BIGINT UNIQUE NOT NULL,
    topic TEXT NOT NULL,
    join_url TEXT NOT NULL,
    start_url TEXT NOT NULL,
    password TEXT,
    start_time TIMESTAMPTZ,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔍 Tests et Validation

### **Test 1 : OAuth Flow**
```bash
# 1. Aller sur https://centrinote.com/zoom-manager
# 2. Clic "Connecter à Zoom"
# 3. Autoriser dans Zoom
# 4. Vérifier retour + token en DB

# Vérification SQL
SELECT user_id, expires_at > NOW() as is_valid FROM zoom_tokens;
```

### **Test 2 : Meeting Creation**
```bash
# 1. S'assurer d'être connecté à Zoom (Test 1)
# 2. Remplir formulaire création réunion
# 3. Clic "Créer la réunion"
# 4. Vérifier retour join_url + start_url

# Test direct webhook
curl -X POST https://n8n.srv886297.hstgr.cloud/webhook/zoom-create-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "topic": "Test Meeting",
    "duration": 30
  }'
```

### **Test 3 : Token Refresh**
```bash
# Test refresh automatique
curl -X POST https://n8n.srv886297.hstgr.cloud/webhook/zoom-oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "type": "refresh_token",
    "user_id": "YOUR_USER_ID"
  }'
```

## ⚠️ Points d'Attention

### **Sécurité**
- ✅ Tokens stockés côté serveur (n8n + Supabase)
- ✅ Pas d'exposition credentials côté client
- ✅ HTTPS obligatoire pour tous les webhooks
- ✅ Validation user_id dans tous les flows

### **Performance**
- ✅ Refresh tokens automatique avant expiration
- ✅ Indexes sur les tables critiques
- ✅ Requêtes optimisées (UPSERT pour tokens)

### **Monitoring**
- 📊 Logs N8N pour debug
- 📊 Métriques Supabase pour performance
- 📊 Webhook success/failure rates

## 🚀 Déploiement

### **Checklist de Mise en Production**
1. ✅ Credentials N8N configurés
2. ✅ Workflows importés et activés  
3. ✅ Tables Supabase créées avec indexes
4. ✅ URLs de redirection Zoom configurées
5. ✅ Variables d'environnement frontend mises à jour
6. ✅ Tests end-to-end validés
7. ✅ Monitoring et alertes configurés

### **URLs Finales**
- **OAuth Callback** : `https://n8n.srv886297.hstgr.cloud/webhook/zoom-oauth-callback`
- **Meeting Creation** : `https://n8n.srv886297.hstgr.cloud/webhook/zoom-create-meeting`
- **Zoom Redirect** : `https://centrinote.com/zoom-callback`
- **Interface Utilisateur** : `https://centrinote.com/zoom-manager`

## 🎯 Résultat Attendu

- ✅ **OAuth simple** : 1 clic → connecté à Zoom
- ✅ **Création instantanée** : Formulaire → meeting créé en <2s
- ✅ **Auto-refresh** : Tokens renouvelés automatiquement
- ✅ **Stable** : Pas de dépendances Redis/Docker/API locale
- ✅ **Sécurisé** : Architecture server-side complète
- ✅ **Scalable** : Multi-utilisateurs sans conflit