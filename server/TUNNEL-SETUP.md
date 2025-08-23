# 🚀 Tunnel HTTPS - Solution Définitive Erreur 4700 Zoom OAuth

## 📋 Problème Résolu

**Erreur 4700 Zoom OAuth**: Zoom rejette les URLs `localhost` dans les redirect_uri OAuth. Cette solution implémente un tunnel HTTPS automatique pour résoudre définitivement ce problème.

## ⚡ Solution Rapide

```bash
# Installer et configurer ngrok (une seule fois)
npm run dev:tunnel
```

## 🔧 Configuration Complète

### 1. Installation ngrok

```bash
# Via Homebrew (recommandé)
brew install ngrok

# Ou via npm
npm install -g @ngrok/ngrok
```

### 2. Authentification ngrok

1. Créer un compte gratuit: https://dashboard.ngrok.com/signup
2. Obtenir votre authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configurer l'authtoken:

```bash
ngrok authtoken YOUR_TOKEN_HERE
```

### 3. Lancement Tunnel

```bash
npm run dev:tunnel
```

## 📋 Configuration Automatique

Le script `tunnel-setup.js` effectue automatiquement:

✅ **Installation ngrok** (si nécessaire)  
✅ **Création tunnel HTTPS** sur port 5174  
✅ **Génération URL tunnel** (ex: `https://abc123.ngrok.io`)  
✅ **Mise à jour .env** avec les bonnes URLs  
✅ **Démarrage serveur** avec configuration tunnel  
✅ **Affichage configuration** pour Zoom Marketplace  

## 🎯 Configuration Zoom Marketplace

Après lancement du tunnel, configurez dans Zoom Marketplace:

```
App URL: https://YOUR_TUNNEL_URL.ngrok.io
Redirect URI: https://YOUR_TUNNEL_URL.ngrok.io/auth/callback
```

## 🛡️ Sécurité

- ✅ **HTTPS forcé**: Cookies sécurisés uniquement
- ✅ **CORS strict**: Seules les URLs HTTPS autorisées
- ✅ **Sanity checks**: Refus localhost en mode HTTPS
- ✅ **Session sécurisée**: SameSite=none pour tunnel

## 🚦 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur localhost (peut avoir erreur 4700) |
| `npm run dev:tunnel` | **Serveur tunnel HTTPS (résout erreur 4700)** |
| `npm run tunnel` | Alias pour dev:tunnel |

## 🔍 Diagnostic

### URLs de Test

Après lancement tunnel, testez:

- **Interface test**: `https://YOUR_TUNNEL_URL.ngrok.io/test-bff`
- **Health check**: `https://YOUR_TUNNEL_URL.ngrok.io/health`
- **OAuth endpoint**: `https://YOUR_TUNNEL_URL.ngrok.io/auth/zoom`

### Logs Serveur

```bash
tail -f server.log
```

### Vérification Configuration

Le serveur affiche automatiquement:
- ✅ Configuration HTTPS validée
- 📋 URLs pour Zoom Marketplace  
- 🌐 URLs de test importantes

## ❌ Résolution Problèmes

### "Authentification ngrok requise"

```bash
# Créer compte + configurer authtoken
ngrok authtoken YOUR_TOKEN_HERE
npm run dev:tunnel
```

### "ERREUR CONFIGURATION: localhost détecté"

Le serveur refuse localhost en mode HTTPS. Utilisez:
- `npm run dev:tunnel` (recommandé)
- Ou `npm run dev` (localhost, peut avoir erreur 4700)

### "Ngrok fermé avec code 1"

Vérifiez:
1. Connexion internet
2. Authtoken configuré
3. Port 5174 libre

## 🔄 Migration depuis localhost

1. **Ancienne configuration** (erreur 4700):
```env
ZOOM_REDIRECT_URI=http://localhost:5174/auth/callback
```

2. **Nouvelle configuration** (résout erreur 4700):
```env
ZOOM_REDIRECT_URI=https://abc123.ngrok.io/auth/callback
FORCE_HTTPS=true
SECURE_COOKIES=true
```

## 📈 Avantages

- 🚀 **Résout définitivement erreur 4700**
- ⚡ **Setup automatique complet**
- 🛡️ **Sécurité HTTPS intégrée**
- 📋 **Instructions claires pour Zoom**
- 🔧 **Maintenance facile**

---

**💡 Conseil**: Utilisez toujours `npm run dev:tunnel` pour éviter l'erreur 4700 Zoom OAuth.