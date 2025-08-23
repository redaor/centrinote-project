# Centrinote - Serveur Zoom OAuth

Serveur Node.js/Express pour l'intégration Zoom OAuth avec interface de test complète.

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte développeur Zoom (https://marketplace.zoom.us/)

### Configuration
1. **Créer une application OAuth Zoom :**
   - Aller sur https://marketplace.zoom.us/
   - Créer une nouvelle app OAuth
   - Configurer les scopes : `meeting:read meeting:write user:read`
   - Définir l'URL de redirection : `http://localhost:5174/zoom/callback`

2. **Configuration du serveur :**
   ```bash
   cd server
   npm install
   ```

3. **Variables d'environnement :**
   Modifier le fichier `.env` avec vos credentials Zoom :
   ```env
   ZOOM_CLIENT_ID=orVpgk
   ZOOM_CLIENT_SECRET=qvYOfpLqyXWysK3zzfxYzlqGKjR94uu7
   ZOOM_REDIRECT_URI=http://localhost:5174/zoom/callback
   ```

### Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le serveur démarre sur : **http://localhost:5174**

## 📋 Fonctionnalités

### ✅ Authentification OAuth Zoom
- Flux OAuth 2.0 complet avec Zoom
- Gestion sécurisée des tokens (chiffrés)
- Refresh automatique des tokens
- Session persistante avec cookies sécurisés

### ✅ API Meetings Zoom
- **GET** `/api/meetings` - Lister les réunions
- **POST** `/api/meetings` - Créer une réunion  
- **GET** `/api/meetings/:id` - Détails d'une réunion
- **PATCH** `/api/meetings/:id` - Modifier une réunion
- **DELETE** `/api/meetings/:id` - Supprimer une réunion
- **GET** `/api/meetings/:id/recordings` - Enregistrements

### ✅ Sécurité
- Middleware d'authentification JWT
- Chiffrement des tokens d'accès
- Protection CSRF avec état OAuth
- Limitation du taux de requêtes
- Gestion des permissions par scope

### ✅ Interface de Test
- Interface web complète sur http://localhost:5174
- Connexion/déconnexion Zoom
- Création de réunions en temps réel
- Liste des réunions avec actions (rejoindre, supprimer)
- Gestion automatique des erreurs et refresh tokens

## 🔧 Architecture

```
server/
├── server.js              # Serveur Express principal
├── routes/
│   ├── zoomAuth.js        # Routes d'authentification OAuth
│   └── zoomMeetings.js    # API CRUD pour les réunions
├── middleware/
│   └── auth.js            # Middlewares d'authentification
├── utils/
│   └── tokenManager.js    # Gestionnaire sécurisé des tokens
├── public/
│   ├── index.html         # Interface de test
│   └── app.js             # Client JavaScript
└── .env                   # Configuration
```

## 📚 API Documentation

### Authentification

#### `GET /auth/zoom`
Génère l'URL d'autorisation OAuth Zoom
```json
{
  "success": true,
  "authUrl": "https://zoom.us/oauth/authorize?...",
  "state": "random_string"
}
```

#### `POST /auth/callback`
Échange le code d'autorisation contre un token
```json
{
  "code": "oauth_code",
  "state": "csrf_state"
}
```

#### `GET /auth/me`
Informations de l'utilisateur connecté
```json
{
  "success": true,
  "user": {
    "id": "zoom_user_id",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

### Réunions

#### `GET /api/meetings`
Liste des réunions de l'utilisateur
```bash
curl -X GET http://localhost:5174/api/meetings \
  --cookie "auth_token=jwt_token"
```

#### `POST /api/meetings`
Créer une nouvelle réunion
```bash
curl -X POST http://localhost:5174/api/meetings \
  --cookie "auth_token=jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Réunion de test",
    "start_time": "2025-01-15T14:00:00Z",
    "duration": 30,
    "agenda": "Discussion sur le projet"
  }'
```

## 🔒 Sécurité

### Stockage des Tokens
- Les tokens d'accès sont chiffrés avec AES-256-CBC
- Stockage temporaire en mémoire (remplacer par Redis/DB en production)
- Refresh automatique avant expiration
- Révocation sécurisée lors de la déconnexion

### Authentification
- JWT signé pour les sessions utilisateur
- Cookies HttpOnly et Secure en production
- Protection CSRF avec état OAuth aléatoire
- Middleware de validation sur toutes les routes API

### Production
Pour la production, considérer :
- Base de données pour les tokens (PostgreSQL/MongoDB)
- Redis pour le cache des sessions
- HTTPS avec certificats SSL
- Variables d'environnement sécurisées
- Logging et monitoring

## 🧪 Tests

### Interface de Test
1. Ouvrir http://localhost:5174
2. Cliquer "Se connecter avec Zoom"
3. Autoriser l'application dans la popup Zoom
4. Tester la création/gestion de réunions

### Tests manuels avec curl
```bash
# Health check
curl http://localhost:5174/health

# Obtenir URL OAuth
curl http://localhost:5174/auth/zoom

# Lister réunions (après authentification)
curl -X GET http://localhost:5174/api/meetings \
  --cookie "auth_token=YOUR_JWT_TOKEN"
```

## 📊 Monitoring

Le serveur expose plusieurs endpoints de diagnostic :

- `GET /health` - État de santé du serveur
- Logs détaillés dans la console
- Gestion centralisée des erreurs
- Statistiques d'utilisation des tokens

## 🚀 Déploiement

### Variables d'environnement de production
```env
NODE_ENV=production
PORT=5174
ZOOM_CLIENT_ID=your_production_client_id
ZOOM_CLIENT_SECRET=your_production_client_secret
ZOOM_REDIRECT_URI=https://your-domain.com/zoom/callback
JWT_SECRET=your_strong_jwt_secret
SESSION_SECRET=your_strong_session_secret
```

### Docker (optionnel)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5174
CMD ["npm", "start"]
```

## 📞 Support

- **Configuration Zoom :** https://marketplace.zoom.us/docs/api-reference/
- **Documentation OAuth :** https://marketplace.zoom.us/docs/guides/auth/oauth/
- **Issues :** Ouvrir un ticket sur le repository

---

**✅ Serveur prêt à l'utilisation avec configuration Zoom fournie !**