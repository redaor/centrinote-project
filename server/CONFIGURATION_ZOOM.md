# 🔧 Configuration Zoom OAuth - Guide Complet

## ❌ Problème actuel
**Erreur :** "client_id non valide : orVpgk"
**Cause :** Client ID de test/placeholder non valide

## 📍 Localisation du Client ID

Le Client ID est configuré dans **un seul fichier** :
```
server/.env
```

**Ligne à modifier :**
```env
ZOOM_CLIENT_ID=orVpgk  # ← REMPLACER par votre vrai Client ID
```

## 🔑 Comment récupérer vos vrais credentials Zoom

### 1. Aller sur Zoom Marketplace
- URL : https://marketplace.zoom.us/
- Se connecter avec votre compte Zoom

### 2. Créer une application OAuth
1. Cliquer "Develop" → "Build App"
2. Choisir "OAuth" App Type
3. Donner un nom à votre app (ex: "Centrinote Integration")

### 3. Configuration de l'app
**App Type :** OAuth  
**Scopes requis :**
- `meeting:read` - Lire les réunions
- `meeting:write` - Créer/modifier réunions  
- `user:read` - Informations utilisateur

**Redirect URL :** 
```
http://localhost:3002/zoom/callback
```

### 4. Récupérer les credentials
Dans l'onglet "App Credentials" :
- **Client ID** : chaîne longue (ex: `ABcd1234EFgh5678IJkl`)
- **Client Secret** : chaîne très longue (ex: `abcd1234efgh5678...`)

## ⚙️ Mise à jour de la configuration

### 1. Modifier le fichier .env
```bash
# Ouvrir le fichier
nano server/.env

# Ou avec votre éditeur préféré
code server/.env
```

### 2. Remplacer les valeurs
```env
# Zoom OAuth Configuration
ZOOM_CLIENT_ID=VOTRE_VRAI_CLIENT_ID_ICI
ZOOM_CLIENT_SECRET=VOTRE_VRAI_CLIENT_SECRET_ICI
ZOOM_REDIRECT_URI=http://localhost:3002/zoom/callback
ZOOM_BASE_URL=https://api.zoom.us/v2
```

### 3. Redémarrer le serveur
```bash
# Arrêter le serveur (Ctrl+C)
# Puis redémarrer
cd server
node server.js
```

## ✅ Format attendu du Client ID

**Format valide :**
- Longueur : 20-30 caractères
- Caractères : lettres + chiffres (alphanumériques)
- Exemple : `ABcd1234EFgh5678IJkl`

**Format invalide :**
- Trop court : `orVpgk` (6 caractères) ❌
- Caractères spéciaux non autorisés
- Espaces dans l'ID

## 🧪 Test de validation

Après modification, tester :
```bash
# Test endpoint auth
curl http://localhost:3002/auth/zoom

# Vérifier l'URL générée contient votre nouveau Client ID
```

## 🚨 Sécurité importante

1. **Ne jamais commiter les vrais credentials**
2. **Créer un .env.example** avec des placeholders
3. **Utiliser des credentials différents** pour production

## 📝 Exemple de .env.example
```env
# Zoom OAuth Configuration - REMPLACER avec vos vrais credentials
ZOOM_CLIENT_ID=your_zoom_client_id_here
ZOOM_CLIENT_SECRET=your_zoom_client_secret_here
ZOOM_REDIRECT_URI=http://localhost:3002/zoom/callback
```

## ⚡ Solution rapide

**Pour tester immédiatement :**
1. Aller sur https://marketplace.zoom.us/
2. Créer une app OAuth
3. Copier Client ID et Secret  
4. Modifier `server/.env`
5. Redémarrer le serveur

**Status :** Une fois les vrais credentials configurés, l'erreur "client_id non valide" disparaîtra ! 🎉