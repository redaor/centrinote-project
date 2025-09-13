# 🚀 API Centrinote - Documentation Complète (Netlify Functions)

## ✅ **Architecture Serverless Netlify**

**CORRECTION MAJEURE** : L'API a été **convertie en Netlify Functions** pour la compatibilité production !
- ✅ **Architecture serverless** - Compatible Netlify/JAMstack
- ✅ **Endpoints Netlify Functions** - Pas de serveur persistant
- ✅ **Authentification Bearer** - Clés API sécurisées
- ✅ **Auto-scaling** - Gestion automatique de la charge
- ✅ **Déploiement intégré** - Avec le site principal

## 🏗️ **Architecture Serverless**

### Stack Technique
- **Netlify Functions** - Serverless Node.js
- **Supabase** - Base de données PostgreSQL intégrée  
- **Crypto** - Génération sécurisée des clés API
- **CORS** - Configuration pour domaines multiples

### Structure des Fichiers
```
netlify/functions/
├── reports.js          # Endpoint principal pour rapports n8n
├── health.js           # Health check et monitoring
├── generate-key.js     # Générateur de clés API (admin)
test-netlify-functions.js  # Suite de tests complète
netlify.toml            # Configuration functions
```

## 🔐 **Système de Clés API**

### Format des Clés
```
cnt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```
- **Préfixe**: `cnt_live_` (identifiable et sécurisé)
- **Longueur**: 64 caractères hexadécimaux
- **Hash SHA-256** stocké en base (jamais la clé en clair)

### Génération et Gestion
```bash
# Générer une nouvelle clé
npm run api:create "Clé n8n Production"

# Lister toutes les clés
npm run api:list

# Tester une clé
npm run api:test cnt_live_abc123...

# Révoquer une clé
npm run api:revoke <key-id>
```

## 📊 **Endpoints API (Netlify Functions)**

### 🌐 **URLs de Production**
- **Reports**: `https://centrinote.netlify.app/.netlify/functions/reports`
- **Health**: `https://centrinote.netlify.app/.netlify/functions/health`  
- **Generate Key**: `https://centrinote.netlify.app/.netlify/functions/generate-key`

### 1. **POST /.netlify/functions/reports** - Réception Rapports n8n
Reçoit les rapports générés par les workflows n8n.

**Headers requis:**
```
Authorization: Bearer cnt_live_abc123...
Content-Type: application/json
```

**Body (format n8n):**
```json
{
  "reportId": "report-centrinote-1234567890-abc123",
  "roomName": "centrinote-1234567890-abc123", 
  "reportData": "{...rapport complet JSON...}",
  "participantEmails": "jean@company.com,marie@company.com",
  "reportType": "meeting_report",
  "metadata": {
    "duration": 1800,
    "participantCount": 3
  }
}
```

**Réponse succès (201):**
```json
{
  "success": true,
  "message": "Report received and stored successfully",
  "data": {
    "id": "uuid-generated",
    "reportId": "report-centrinote-1234567890-abc123",
    "roomName": "centrinote-1234567890-abc123",
    "storedAt": "2024-01-15T10:30:00Z",
    "participantCount": 2
  }
}
```

### 2. **GET /.netlify/functions/reports** - Récupération Rapports
Récupère la liste des rapports stockés avec pagination et filtres.

**Paramètres optionnels:**
- `limit=50` - Nombre de résultats (max 100)
- `offset=0` - Décalage pour pagination
- `roomName=centrinote-123` - Filtrer par salle
- `reportType=meeting_report` - Filtrer par type
- `startDate=2024-01-01` - Date de début
- `endDate=2024-01-31` - Date de fin

**Exemple:**
```bash
GET /.netlify/functions/reports?limit=10&roomName=centrinote-session-123
Authorization: Bearer cnt_live_abc123...
```

### 3. **GET /.netlify/functions/health** - Santé de l'API
Vérification du statut de l'API (aucune authentification requise).

**Réponse:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "environment": "production"
}
```

### 4. **POST /.netlify/functions/generate-key** - Génération Clés API
Crée une nouvelle clé API (nécessite un master token).

**Headers requis:**
```
Authorization: Bearer master_token_admin
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Clé n8n Production",
  "permissions": ["reports:write"],
  "expiresIn": 90,
  "metadata": {
    "purpose": "n8n_integration",
    "environment": "production"
  }
}
```

## 🚀 **Guide de Déploiement Netlify**

### 1. **Déploiement Automatique**
Les Netlify Functions sont déployées automatiquement avec votre site !
```bash
# Build et déploiement
npm run build
# Les functions sont déployées avec le site
```

### 2. **Tests Local avec Netlify CLI**
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Tester les functions localement
netlify dev

# Functions disponibles sur:
# http://localhost:8888/.netlify/functions/reports
# http://localhost:8888/.netlify/functions/health
# http://localhost:8888/.netlify/functions/generate-key
```

### 3. **Configuration Variables d'Environnement Netlify**
Dans l'interface Netlify (Site settings > Build & deploy > Environment variables) :
```env
# Supabase (OBLIGATOIRES pour les functions)
VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
SUPABASE_SERVICE_KEY=eyJ...votre_service_key

# Sécurité API
MASTER_API_TOKEN=votre_token_admin_super_secret

# Environment
NODE_ENV=production
```

⚠️ **IMPORTANT** : `SUPABASE_SERVICE_KEY` doit être la **Service Role Key** (pas l'Anon Key) pour avoir les permissions d'écriture !

### 3. **Tables Supabase Requises**
Exécuter ce SQL dans l'éditeur Supabase :

```sql
-- Table pour les clés API
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['reports:write'],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table pour les rapports
CREATE TABLE meeting_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id VARCHAR(255) NOT NULL UNIQUE,
  room_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) DEFAULT 'meeting_report',
  report_data JSONB NOT NULL,
  participant_emails TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_reports_room ON meeting_reports(room_name);
CREATE INDEX idx_reports_created ON meeting_reports(created_at);
```

### 4. **Vérification du Déploiement**

#### Test rapide des endpoints
```bash
# Health check (pas d'auth requise)
curl "https://centrinote.netlify.app/.netlify/functions/health"

# Test CORS
curl -X OPTIONS "https://centrinote.netlify.app/.netlify/functions/reports"

# Test auth (avec une clé générée)
curl -H "Authorization: Bearer cnt_live_..." \
  "https://centrinote.netlify.app/.netlify/functions/reports"
```

#### Vérification via l'interface Netlify
1. **Functions tab** - Voir les functions déployées
2. **Function logs** - Surveiller les erreurs
3. **Analytics** - Monitoring des performances

### 5. **Configuration n8n (PRODUCTION)**
Dans votre workflow n8n, utiliser :

**URL:** `https://centrinote.netlify.app/.netlify/functions/reports`
**Method:** POST
**Headers:**
```
Authorization: Bearer cnt_live_votre_cle_generee
Content-Type: application/json
```

**Body:**
```json
{
  "reportId": "{{ $('Jitsi Recording').item.json.recordingId }}",
  "roomName": "{{ $('Jitsi Recording').item.json.roomName }}",
  "reportData": "{{ $('AI Processing').item.json.reportData }}",
  "participantEmails": "{{ $('Participants').item.json.emails.join(',') }}"
}
```

## 🧪 **Tests et Validation (Netlify Functions)**

### Tests Automatiques
```bash
# Tests complets des Netlify Functions
node test-netlify-functions.js

# Tests avec clé API
TEST_API_KEY=cnt_live_... node test-netlify-functions.js

# Tests avec master token (admin)
MASTER_API_TOKEN=admin_token TEST_API_KEY=cnt_live_... node test-netlify-functions.js
```

### Tests manuels avec curl (Production)
```bash
# Santé API
curl "https://centrinote.netlify.app/.netlify/functions/health"

# Test CORS preflight
curl -X OPTIONS "https://centrinote.netlify.app/.netlify/functions/reports"

# Envoi rapport de test
curl -X POST \
  -H "Authorization: Bearer cnt_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "reportId": "test-123",
    "roomName": "test-room",
    "reportData": "{\"transcript\": \"Test\"}"
  }' \
  "https://centrinote.netlify.app/.netlify/functions/reports"

# Récupérer les rapports
curl -H "Authorization: Bearer cnt_live_..." \
  "https://centrinote.netlify.app/.netlify/functions/reports?limit=5"
```

## 🛡️ **Sécurité Implémentée**

### Authentification
- ✅ **Bearer tokens** avec clés API uniques
- ✅ **Hashing SHA-256** - jamais de clés en clair
- ✅ **Permissions granulaires** par clé
- ✅ **Expiration configurable** des clés

### Protection
- ✅ **Auto-scaling serverless** - Gestion charge automatique
- ✅ **CORS** configuré pour domaines multiples
- ✅ **Validation stricte** des données entrantes
- ✅ **Logs CloudWatch** via Netlify pour traçabilité

### Monitoring
- ✅ **Usage tracking** par clé API en Supabase
- ✅ **Health checks** intégrés serverless
- ✅ **Netlify Analytics** pour performance
- ✅ **Function logs** en temps réel
- ✅ **Révocation** immédiate des clés via admin

## 🎯 **Intégration n8n Workflow (PRODUCTION READY)**

Votre workflow n8n doit maintenant utiliser :

1. **Trigger** : Webhook Jitsi recording finished
2. **Processing** : Transcription + IA (votre workflow existant)
3. **HTTP Request** vers `https://centrinote.netlify.app/.netlify/functions/reports`
4. **Headers** : `Authorization: Bearer cnt_live_your_production_key`
5. **Payload** : Format JSON documenté ci-dessus
6. **Error handling** : Retry logic + fallback

## 💡 **Alternatives Considérées**

### API-as-a-Service (non recommandées pour ce cas)
- **Zapier** - Limite de personnalisation
- **Integromat** - Coûts élevés pour volumes
- **Pipedream** - Dépendance externe forte

### Solutions No-Code (insuffisantes)
- **Airtable API** - Pas de logique métier complexe
- **Google Sheets API** - Performance limitée
- **Firebase** - Nécessite quand même du code

**Conclusion** : **Netlify Functions** offrent la **meilleure compatibilité**, **l'auto-scaling** et **l'intégration** pour une architecture JAMstack.

---

## ✅ **Status : API SERVERLESS COMPLÈTE ET PRÊTE**

🎉 L'API Centrinote (Netlify Functions) est fonctionnelle avec :
- ✅ **Architecture serverless** - Compatible production Netlify
- ✅ **Authentification sécurisée** avec clés API
- ✅ **3 Endpoints fonctionnels** (reports, health, generate-key)
- ✅ **Stockage Supabase** intégré
- ✅ **Tests automatisés** complets
- ✅ **Auto-scaling** et haute disponibilité
- ✅ **Sécurité production** implémentée

## 🚀 **URLs FINALES POUR N8N**

**Endpoint principal** : `https://centrinote.netlify.app/.netlify/functions/reports`
**Health check** : `https://centrinote.netlify.app/.netlify/functions/health`
**Admin key gen** : `https://centrinote.netlify.app/.netlify/functions/generate-key`

**Prochaines étapes** :
1. Déployez le code (push vers main)
2. Configurez les variables d'environnement Netlify
3. Générez une clé API de production
4. Mettez à jour votre workflow n8n avec la nouvelle URL