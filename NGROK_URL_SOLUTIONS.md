# 🔧 Solutions pour URLs ngrok Changeantes - Guide Complet

## 🎯 Problème Résolu
**URLs ngrok qui changent à chaque redémarrage → Erreur Zoom 4700 "Invalid redirect URI"**

## ✅ 3 Solutions Disponibles

### 🏆 Solution 1: Domaine ngrok Fixe (RECOMMANDÉE)

#### Avantages
- ✅ URL fixe qui ne change jamais
- ✅ Fonctionne avec Zoom OAuth
- ✅ Configuration une seule fois

#### Configuration
```bash
# 1. Exécuter le script de configuration
./setup-ngrok-fixed.sh

# 2. Démarrer ngrok avec domaine fixe
ngrok start --all --config=ngrok.yml

# 3. Votre URL sera toujours: https://centrinote-dev.ngrok.io
```

#### URL Zoom Marketplace
```
https://centrinote-dev.ngrok.io/auth/callback
```

---

### 🤖 Solution 2: Script de Mise à Jour Automatique

#### Avantages
- ✅ Détection automatique de la nouvelle URL
- ✅ Mise à jour instantanée de tous les fichiers
- ✅ Backup automatique

#### Utilisation
```bash
# À chaque fois que ngrok redémarre
./update-ngrok-url.sh

# Le script va :
# 1. Détecter la nouvelle URL ngrok
# 2. Mettre à jour automatiquement .env
# 3. Vous rappeler de mettre à jour Zoom Marketplace
```

---

### 🏠 Solution 3: Mode Localhost (Tests Rapides)

#### Avantages
- ✅ Pas de dépendance ngrok
- ✅ Tests rapides du frontend
- ✅ Basculement facile

#### Utilisation
```bash
# Basculer vers localhost pour tests rapides
./switch-dev-mode.sh localhost

# Revenir à ngrok pour tests OAuth complets
./switch-dev-mode.sh ngrok

# Vérifier le mode actuel
./switch-dev-mode.sh status
```

## 🚀 Workflow Recommandé

### Pour le Développement Quotidien
1. **Utilisez la Solution 1** (domaine fixe) - Configuration une fois, fonctionne toujours

### Si Vous N'avez Pas de Domaine Fixe
1. **Démarrez ngrok** normalement
2. **Exécutez** `./update-ngrok-url.sh` pour mettre à jour automatiquement
3. **Mettez à jour Zoom Marketplace** avec la nouvelle URL
4. **Testez** l'authentification

### Pour Tests Rapides Sans OAuth
1. **Basculez** vers localhost avec `./switch-dev-mode.sh localhost`
2. **Développez** et testez votre UI
3. **Revenez** à ngrok quand vous avez besoin d'OAuth

## 📋 Configuration Actuelle

### ✅ Votre .env est mis à jour avec
```
https://e28205742e0c.ngrok-free.app/auth/callback
```

### 🎯 Actions Immédiates

1. **Mettez à jour Zoom Marketplace :**
   - 🔗 https://marketplace.zoom.us/
   - Manage → Built Apps → Votre app OAuth
   - Onglet "OAuth" → Redirect URL for OAuth
   - **Nouvelle URL :** `https://e28205742e0c.ngrok-free.app/auth/callback`
   - Save et attendre 2-3 minutes

2. **Redémarrez vos serveurs :**
   ```bash
   # Backend
   cd server && npm start
   
   # Frontend  
   npm run dev
   ```

3. **Testez l'authentification Zoom** - L'erreur 4700 devrait disparaître !

## 🛠️ Scripts Disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `setup-ngrok-fixed.sh` | Configure un domaine ngrok fixe | `./setup-ngrok-fixed.sh` |
| `update-ngrok-url.sh` | Met à jour automatiquement les URLs | `./update-ngrok-url.sh` |
| `switch-dev-mode.sh` | Bascule entre localhost et ngrok | `./switch-dev-mode.sh [localhost\|ngrok]` |

## 🔍 Diagnostic

### Vérifier votre configuration
1. **Ouvrez votre app :** `https://e28205742e0c.ngrok-free.app`
2. **Allez dans Settings → Debug & API**
3. **Utilisez les outils de diagnostic** pour vérifier la configuration

### En cas de problème
1. **Vérifiez que ngrok fonctionne :** `curl https://e28205742e0c.ngrok-free.app/health`
2. **Vérifiez les logs du serveur** pour voir l'URL utilisée
3. **Exécutez** `./switch-dev-mode.sh status` pour voir la configuration actuelle

## 💡 Conseils Avancés

### Pour Éviter Ce Problème à l'Avenir
1. **Obtenez un compte ngrok payant** ($8/mois) pour domaines fixes illimités
2. **Ou utilisez un service similaire** (localtunnel, cloudflare tunnel)
3. **Configurez un serveur de développement permanent** sur un VPS

### Alternatives Gratuites
- **localtunnel :** `npx localtunnel --port 5174 --subdomain centrinote`
- **serveo :** `ssh -R 80:localhost:5174 serveo.net`

---

🎉 **Avec ces solutions, vous ne devriez plus jamais avoir de problème d'URL ngrok changeante !**