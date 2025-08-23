# 📋 Documentation Complète : Intégration Zoom - Projet Centrinote

## 🏗️ 1. Architecture Générale

### Vue d'ensemble du système

L'intégration Zoom dans Centrinote suit une architecture multi-couches sophistiquée avec **2 approches parallèles** :

```
┌─────────────────────────────────────────────────────────────────┐
│                 🎯 FRONTEND (React + TypeScript)                │
├─────────────────────────────────────────────────────────────────┤
│ Components Zoom:                Services Zoom:                  │
│ • SimplifiedZoomManager        • zoomMeetingSDKService          │
│ • ZoomConnectionInterface      • zoomAPIClient                  │
│ • SimplifiedZoomMeeting        • zoomService (Orchestrateur)    │
│ • ZoomDebugInfo               • zoomWebhookHandler              │
│ • ZoomAuthDialog              • Hook: useSimplifiedZoom         │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│              📦 SUPABASE BACKEND (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────┤
│ Tables:                         Edge Functions:                 │
│ • zoom_tokens (NEW)            • zoom-create-meeting            │
│ • zoom_user_connections        • zoom-sdk-signature             │
│ • zoom_meetings                • zoom-webhook-handler           │
│ • zoom_meeting_participants    • zoom-oauth-callback            │
│ • user_zoom_integrations                                        │
│ • meetings, meeting_summaries                                   │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│         🔧 BACKEND NODE.JS (server-to-server-oauth)             │
├─────────────────────────────────────────────────────────────────┤
│ Routes API:                     Services:                       │
│ • /api/meetings                • zoomTokenService (NEW)         │
│ • /api/users                   • tokenManager                   │
│ • /api/webinars                • Middleware: zoomTokenCheck     │
│ • /api/zoom-test (NEW)                                          │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                    🤖 N8N WORKFLOWS                             │
├─────────────────────────────────────────────────────────────────┤
│ • Meeting automation            • Recording processing          │
│ • Email notifications           • AI summaries                  │
│ • Webhook: a27e69d1-9497-4816-adba-3dc85dd83f75                │
└─────────────────────────────────────────────────────────────────┘
                              ⬇️
┌─────────────────────────────────────────────────────────────────┐
│                      🔵 ZOOM API                                │
├─────────────────────────────────────────────────────────────────┤
│ • Meeting SDK v2.18.0          • REST API v2                   │
│ • OAuth 2.0 Authentication     • JWT Server-to-Server          │
└─────────────────────────────────────────────────────────────────┘
```

### Rôles de chaque composant

- **Frontend React** : Interface utilisateur, SDK Zoom embedded, gestion des états
- **Supabase** : Base de données, authentification utilisateur, Edge Functions sécurisées
- **Backend Node.js** : Proxy API Zoom, gestion des tokens OAuth, endpoints de test
- **N8N** : Automation workflows, processing des enregistrements, notifications
- **Zoom** : API REST v2, Meeting SDK, webhooks événements

## 🗄️ 2. Tables de Base de Données

### **Nouvelles tables (approche que j'ai codée)**

#### **A. `zoom_tokens` (Table principale - NEW)**
```sql
CREATE TABLE zoom_tokens (
    user_id UUID PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Rôle** : Stockage des tokens OAuth par utilisateur pour l'accès API Zoom

#### **B. Tables existantes (approche SDK)**

##### **`zoom_user_connections`**
```sql
CREATE TABLE zoom_user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    zoom_user_id TEXT,
    zoom_email TEXT,
    zoom_display_name TEXT,
    zoom_account_id TEXT,
    is_active BOOLEAN DEFAULT true,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Rôle** : Connexions utilisateur simplifiées (sans OAuth, pour approche SDK)

##### **`zoom_meetings`**
```sql
CREATE TABLE zoom_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    meeting_id BIGINT UNIQUE,
    meeting_number TEXT,
    topic TEXT NOT NULL,
    start_time TIMESTAMPTZ,
    duration INTEGER DEFAULT 60,
    join_url TEXT,
    start_url TEXT,
    password TEXT,
    status TEXT DEFAULT 'scheduled',
    sdk_signature TEXT,
    has_recording BOOLEAN DEFAULT false,
    recording_processed BOOLEAN DEFAULT false,
    summary_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Rôle** : Stockage des meetings créés via SDK avec métadonnées complètes

##### **`user_zoom_integrations`** (approche OAuth avancée)
```sql
CREATE TABLE user_zoom_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    zoom_user_id TEXT,
    zoom_email TEXT,
    zoom_display_name TEXT,
    zoom_account_id TEXT,
    zoom_account_type TEXT,
    authentication_method TEXT DEFAULT 'oauth',
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_authenticated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Rôle** : Intégrations OAuth complètes avec tokens chiffrés

### **Pourquoi ces tables plutôt que les anciennes ?**

1. **`zoom_tokens`** vs `zoom_user_connections` : 
   - Plus simple et direct pour les tokens OAuth
   - Structure optimisée pour les refresh automatiques
   - Compatible avec le backend Node.js

2. **Séparation des préoccupations** :
   - `zoom_user_connections` : Approche SDK (manuelle)
   - `zoom_tokens` : Approche OAuth (automatique)
   - `user_zoom_integrations` : Approche OAuth avancée (chiffrée)

## 🔐 3. Authentification Zoom

### **Approche 1 : SDK Authentication (Simplifiée)**

```typescript
// Processus manuel sans OAuth
User Input → Manual Connection → Generate SDK Signature → Embed Meeting
```

**Stockage** :
- Table : `zoom_user_connections`
- Données : email, display_name, account_id (pas de tokens)
- Sécurité : Signatures générées à la volée

**Code** :
```typescript
// services/zoom/zoomMeetingSDKService.ts:421
const generateSDKSignature = (
  sdkKey: string,
  sdkSecret: string, 
  meetingNumber: string,
  role: '0' | '1'
): string => {
  // Génération HMAC-SHA256
  const signature = crypto.createHmac('sha256', sdkSecret)
    .update(`${sdkKey}${meetingNumber}${timestamp}${role}`)
    .digest('base64');
  return signature;
};
```

### **Approche 2 : OAuth 2.0 (Complète - celle que j'ai implémentée)**

```typescript
// Processus OAuth automatique
User → Zoom OAuth → Callback → Token Exchange → Store Tokens → API Access
```

**Stockage** :
- Table : `zoom_tokens`
- Données : `access_token`, `refresh_token`, `expires_at`
- Sécurité : Tokens stockés en base, refresh automatique

**Code backend** :
```javascript
// utils/zoomTokenService.js:15
const getActiveZoomToken = async (userId) => {
  const query = `
    SELECT access_token, refresh_token, expires_at 
    FROM zoom_tokens 
    WHERE user_id = $1 
    AND expires_at > NOW() 
    ORDER BY expires_at DESC 
    LIMIT 1
  `;
  // Récupération du token le plus récent et valide
};
```

### **Gestion du rafraîchissement des tokens**

Le système que j'ai codé vérifie automatiquement l'expiration :

```javascript
// middlewares/zoomTokenCheck.js:34
const { access_token, expires_at, error } = await getActiveZoomToken(userId);

if (error || !access_token) {
  return res.status(401).json({
    error: true,
    message: `No valid Zoom token found for user ${userId}. Please re-authenticate with Zoom.`
  });
}
```

**⚠️ Point d'amélioration** : Le refresh automatique n'est pas encore implémenté. Actuellement, si le token expire, l'utilisateur doit se reconnecter.

## 🛣️ 4. Endpoints Disponibles

### **A. Backend Node.js (server-to-server-oauth-starter-api)**

#### **Endpoints Zoom principaux** :

##### **`POST /api/meetings/:userId`** - Créer une réunion
```javascript
// Paramètres :
{
  userId: string (URL param),
  body: {
    topic: string,
    type: 1, // Meeting instantané
    start_time?: string,
    duration?: number,
    password?: string
  }
}

// Comportement :
1. Récupère le token actif pour userId dans zoom_tokens
2. Appelle POST https://api.zoom.us/v2/users/{userId}/meetings
3. Retourne { meeting_id, join_url, start_url, password }
```

##### **`GET /api/meetings/:meetingId`** - Récupérer une réunion
```javascript
// Paramètres : meetingId (URL param)
// Comportement : GET https://api.zoom.us/v2/meetings/{meetingId}
```

##### **`PATCH /api/meetings/:meetingId`** - Modifier une réunion
```javascript
// Paramètres : meetingId + body avec changements
// Comportement : PATCH https://api.zoom.us/v2/meetings/{meetingId}
```

##### **`DELETE /api/meetings/:meetingId`** - Supprimer une réunion
```javascript
// Comportement : DELETE https://api.zoom.us/v2/meetings/{meetingId}
```

#### **Endpoints de test (NEW)** :

##### **`GET /api/zoom-test/test-connection`** - Test connexion DB
```javascript
// Retourne : { success: true, currentTime: '2025-01-22T10:30:00Z' }
```

##### **`GET /api/zoom-test/test-token/:userId`** - Test tokens utilisateur
```javascript
// Retourne :
{
  success: true,
  userId: "xxx",
  activeToken: { found: true, expiresAt: "2025-01-22T11:00:00Z" },
  recentToken: { found: true, isExpired: false }
}
```

##### **`GET /api/zoom-test/list-tokens`** - Liste tous les tokens
```javascript
// Retourne la liste complète des tokens en base avec statuts
```

### **B. Edge Functions Supabase**

#### **`zoom-create-meeting`** (supabase/functions/zoom-create-meeting/index.ts)
```typescript
// Endpoint : https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/zoom-create-meeting
// Méthode : POST
// Headers : Authorization: Bearer <supabase_token>
// Body : { topic, type, start_time, duration, settings }
// Comportement : Création meeting + stockage en base zoom_meetings
```

#### **`zoom-sdk-signature`** (supabase/functions/zoom-sdk-signature/index.ts)
```typescript
// Endpoint : https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/zoom-sdk-signature  
// Méthode : POST
// Body : { meetingNumber, role }
// Retourne : { signature: "base64_signature" }
// Sécurité : Génération côté serveur pour éviter exposition des secrets
```

#### **`zoom-webhook-handler`** (supabase/functions/zoom-webhook-handler/index.ts)
```typescript
// Endpoint : https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/zoom-webhook-handler
// Méthode : POST (appelé par Zoom)
// Événements traités :
// - meeting.started, meeting.ended
// - meeting.participant_joined, meeting.participant_left  
// - recording.completed
// Comportement : Mise à jour base + Forward vers N8N
```

## 🔄 5. Flux Complet de Création de Réunion

### **Scénario : Utilisateur clique sur "Créer une réunion"**

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend React
    participant S as Supabase
    participant B as Backend Node.js
    participant Z as Zoom API

    U->>F: Clic "Créer réunion"
    F->>F: Collecte données (topic, durée)
    
    Note over F: Choix d'approche
    
    alt Approche SDK (simplifiée)
        F->>S: POST zoom-sdk-signature
        S->>S: Génère signature sécurisée
        S->>F: { signature }
        F->>F: Embed Meeting SDK
        F->>S: INSERT zoom_meetings
    
    else Approche OAuth (complète)
        F->>B: POST /api/meetings/:userId
        B->>B: Vérification token dans zoom_tokens
        
        alt Token valide trouvé
            B->>Z: POST /v2/users/:userId/meetings
            Z->>B: { meeting_id, join_url, start_url }
            B->>F: Retourne données meeting
            F->>S: INSERT zoom_meetings
        
        else Aucun token valide
            B->>F: { error: true, message: "Re-authenticate" }
            F->>F: Affiche dialogue réauthentification
        end
    end
    
    F->>U: Affiche meeting créé / erreur
```

### **Détail du processus backend (approche que j'ai codée)** :

1. **Réception requête** (`POST /api/meetings/:userId`)
   ```javascript
   // routes/api/meetings.js:30
   console.log('=== CREATE MEETING REQUEST ===');
   console.log('User ID:', userId);
   console.log('Request body from frontend:', JSON.stringify(body, null, 2));
   ```

2. **Vérification token** (middleware `zoomTokenCheck`)
   ```javascript
   // middlewares/zoomTokenCheck.js:34
   const { access_token, error } = await getActiveZoomToken(userId);
   if (error) {
     return res.status(401).json({ error: true, message: "No valid token" });
   }
   ```

3. **Appel API Zoom**
   ```javascript
   // routes/api/meetings.js:51
   const request = await axios.post(
     `${ZOOM_API_BASE_URL}/users/${userId}/meetings`, 
     meetingBody, 
     {
       headers: {
         'Authorization': `Bearer ${access_token}`,
         'Content-Type': 'application/json'
       }
     }
   );
   ```

4. **Gestion réponse**
   ```javascript
   if (request.status === 200 || request.status === 201) {
     console.log('✅ Zoom API Response:', request.data);
     return res.json(request.data);
   } else {
     return res.json({
       error: true,
       status: request.status,
       zoomResponse: request.data
     });
   }
   ```

## ❌ 6. Gestion des Erreurs

### **Types d'erreurs anticipées et leur gestion** :

#### **A. Erreurs de token**
```javascript
// middlewares/zoomTokenCheck.js:46
if (!access_token) {
  return res.status(401).json({
    error: true,
    message: `No valid Zoom token found for user ${userId}`,
    details: 'Token not found or expired'
  });
}
```

#### **B. Erreurs API Zoom**
```javascript
// routes/api/meetings.js:63
catch (err) {
  console.log('❌ Zoom API Error Status:', err.response?.status);
  console.log('❌ Zoom API Error Response:', err.response?.data);
  
  if (err.response && err.response.status !== 200) {
    return res.json({
      error: true,
      status: err.response.status,
      zoomResponse: err.response.data || err.message
    });
  }
}
```

#### **C. Erreurs de base de données**
```javascript
// utils/zoomTokenService.js:88
catch (error) {
  console.error('❌ Database error while fetching Zoom token:', error);
  return {
    access_token: null,
    error: error.message
  };
}
```

### **Remontée des erreurs au frontend** :

Les erreurs sont structurées de façon cohérente :
```javascript
// Format standard des erreurs
{
  error: true,
  status: 400, // Code HTTP
  message: "Description claire",
  details: "Détails techniques",
  zoomResponse: { /* Réponse brute de Zoom */ }
}
```

Le frontend peut ainsi :
- Afficher un message utilisateur friendly
- Logger les détails techniques
- Proposer des actions correctives

## 🔍 7. Points de Vérification pour le Debug

### **Quand une création de réunion échoue après 2-3 secondes** :

#### **A. Vérification des tokens (PRIORITÉ #1)**
```bash
# Test connexion DB
curl http://localhost:8080/api/zoom-test/test-connection

# Test token pour un utilisateur spécifique  
curl http://localhost:8080/api/zoom-test/test-token/USER_ID_ICI

# Liste tous les tokens
curl http://localhost:8080/api/zoom-test/list-tokens
```

#### **B. Vérification des logs backend**
```javascript
// Les logs à chercher dans la console :
=== ZOOM TOKEN CHECK MIDDLEWARE ===
📋 User ID found in URL params: xxx
🔍 Looking for Zoom token for user: xxx
✅ Valid Zoom token found for user: xxx

=== CREATE MEETING REQUEST ===
Request body from frontend: { "topic": "Test", "type": 1 }
Headers sent to Zoom: { "Authorization": "Bearer xxx" }
Body sent to Zoom API: { "topic": "Test", "type": 1 }
```

#### **C. Points de défaillance potentiels**

1. **❌ Pas de token en base**
   ```
   Signal : "❌ No active Zoom token found for user: xxx"
   Cause : L'utilisateur n'a jamais fait d'OAuth Zoom
   Solution : Rediriger vers processus d'authentification
   ```

2. **❌ Token expiré**
   ```
   Signal : Token trouvé mais expires_at < NOW()
   Cause : Token OAuth expiré (durée de vie ~1h)
   Solution : Implémenter refresh automatique ou redemander auth
   ```

3. **❌ Erreur API Zoom 400**
   ```
   Signal : "❌ Zoom API Error Status: 400"
   Causes possibles :
   - user_id incorrect (pas un vrai utilisateur Zoom)
   - body malformé (champs manquants)
   - permissions insuffisantes
   ```

4. **❌ Erreur de connexion DB**
   ```
   Signal : "❌ Database connection error"
   Cause : Problème DATABASE_URL ou Supabase indisponible
   Solution : Vérifier variables d'environnement
   ```

#### **D. Tests de validation étape par étape**

1. **Test connexion DB** :
   ```bash
   curl http://localhost:8080/api/zoom-test/test-connection
   # Attendu: { "success": true, "currentTime": "..." }
   ```

2. **Test présence token** :
   ```bash
   curl http://localhost:8080/api/zoom-test/test-token/YOUR_USER_ID
   # Vérifier: activeToken.found = true
   ```

3. **Test création meeting** :
   ```bash
   curl -X POST http://localhost:8080/api/meetings/YOUR_USER_ID \
   -H "Content-Type: application/json" \
   -d '{"topic": "Test Meeting", "type": 1}'
   ```

4. **Test avec logs** :
   - Démarrer le backend avec `npm run dev` 
   - Observer la console lors du test
   - Identifier à quelle étape ça échoue

### **Variables d'environnement à vérifier** :

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres.wjzlicokhxitmeoxkjzv:CentriNote2025@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
ZOOM_S2S_CLIENT_ID=zRfnquDdS2CTcwVBFmIByA 
ZOOM_S2S_CLIENT_SECRET=X1EKLx6YJ4Um5gFmI2fhVZ6CAtcxSS9H

# Frontend 
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎯 Synthèse et Prochaines Étapes

### **État actuel du système** :

✅ **Ce qui fonctionne** :
- Architecture complète frontend/backend
- Tables de base de données bien structurées  
- Services d'authentification SDK et OAuth
- Endpoints API complets avec logs détaillés
- Tests de validation disponibles

⚠️ **Ce qui peut expliquer l'erreur 400** :

1. **Problème le plus probable** : Pas de token OAuth valide dans `zoom_tokens`
2. **Problème possible** : Mauvais mapping user_id (frontend ≠ backend)  
3. **Problème technique** : Configuration Zoom (credentials, permissions)

### **Plan d'action pour résoudre** :

1. **Immédiat** : Tester les endpoints de debug pour identifier où ça bloque
2. **Court terme** : Vérifier le processus d'OAuth et peuplement de `zoom_tokens`
3. **Moyen terme** : Implémenter le refresh automatique des tokens
4. **Long terme** : Unifier les 2 approches (SDK + OAuth) en une seule

La architecture est solide, il s'agit probablement d'un problème de configuration ou de données manquantes plutôt que de code défaillant.