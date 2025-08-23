# 🚨 Guide de Résolution - Erreur Zoom 4700 "Invalid redirect URI"

## ❓ Qu'est-ce que l'erreur 4700 ?

L'erreur 4700 "Invalid redirect URI" se produit quand l'URL de callback envoyée dans la requête OAuth ne correspond **EXACTEMENT** pas à celle configurée dans Zoom Marketplace.

## 🔍 Diagnostic Rapide

1. **Ouvrez votre application** via ngrok : `https://03526871154.ngrok-free.app`
2. **Allez dans Settings → Debug & API**
3. **Utilisez le composant "Diagnostic Configuration Zoom OAuth"**
4. **Cliquez sur "Tester l'URL OAuth"** pour voir l'URL exacte envoyée à Zoom

## ✅ Étapes de Résolution

### 1. Vérifiez votre fichier `.env`

```bash
# Votre configuration actuelle
VITE_ZOOM_REDIRECT_URI=https://03526871154.ngrok-free.app/auth/callback
ZOOM_REDIRECT_URI=https://03526871154.ngrok-free.app/auth/callback
```

### 2. Mettez à jour Zoom Marketplace

#### A. Connectez-vous à Zoom Marketplace
🔗 **URL :** https://marketplace.zoom.us/

#### B. Naviguez vers votre application
1. Cliquez sur **"Manage"** dans le menu principal
2. Sélectionnez **"Built Apps"**
3. Trouvez et cliquez sur votre application OAuth

#### C. Mettez à jour le Redirect URI
1. Allez dans l'onglet **"OAuth"**
2. Dans la section **"Redirect URL for OAuth"**
3. **Supprimez l'ancienne URL** si elle existe
4. **Ajoutez la nouvelle URL :**
   ```
   https://03526871154.ngrok-free.app/auth/callback
   ```
5. **Cliquez sur "Save"**

#### D. Attendez la propagation
⏱️ **Important :** Attendez 2-3 minutes pour que les changements se propagent dans le système Zoom.

### 3. Vérifiez les logs du serveur

Regardez les logs de votre serveur backend pour voir l'URL exacte envoyée :

```bash
# Dans les logs, vous devriez voir :
🎯 REDIRECT_URI envoyé à Zoom: https://03526871154.ngrok-free.app/auth/callback
```

### 4. Testez la configuration

1. **Redémarrez votre serveur backend** pour charger les nouvelles variables
2. **Testez l'authentification Zoom**
3. **Vérifiez que l'erreur 4700 n'apparaît plus**

## 🔧 Problèmes Courants

### ❌ URL avec un trailing slash
```bash
# INCORRECT
https://03526871154.ngrok-free.app/auth/callback/

# CORRECT  
https://03526871154.ngrok-free.app/auth/callback
```

### ❌ Différence entre HTTP et HTTPS
```bash
# INCORRECT
http://03526871154.ngrok-free.app/auth/callback

# CORRECT
https://03526871154.ngrok-free.app/auth/callback
```

### ❌ Ancienne URL ngrok dans Zoom Marketplace
Si vous avez changé d'URL ngrok, l'ancienne URL reste dans Zoom Marketplace.

**Solution :** Supprimez l'ancienne et ajoutez la nouvelle.

## 🆘 Dépannage Avancé

### Si l'erreur persiste après mise à jour

1. **Vérifiez le cache Zoom :**
   - Déconnectez-vous de Zoom Marketplace
   - Reconnectez-vous
   - Vérifiez que l'URL est bien sauvegardée

2. **Vérifiez la cohérence des variables :**
   ```bash
   # Ces deux DOIVENT être identiques
   VITE_ZOOM_REDIRECT_URI=https://03526871154.ngrok-free.app/auth/callback
   ZOOM_REDIRECT_URI=https://03526871154.ngrok-free.app/auth/callback
   ```

3. **Testez avec curl :**
   ```bash
   curl "https://03526871154.ngrok-free.app/auth/zoom"
   ```

### Logs utiles à vérifier

Dans votre serveur backend, cherchez ces logs :
```
✅ ZOOM_REDIRECT_URI validé: https://03526871154.ngrok-free.app/auth/callback
🎯 REDIRECT_URI envoyé à Zoom: https://03526871154.ngrok-free.app/auth/callback
```

## 📋 Checklist de Vérification

- [ ] ✅ URL ngrok active et accessible
- [ ] ✅ Variable `VITE_ZOOM_REDIRECT_URI` correcte dans `.env`
- [ ] ✅ Variable `ZOOM_REDIRECT_URI` correcte dans `.env`
- [ ] ✅ URL mise à jour dans Zoom Marketplace
- [ ] ✅ Pas de trailing slash dans l'URL
- [ ] ✅ HTTPS (pas HTTP) dans l'URL
- [ ] ✅ Serveur backend redémarré
- [ ] ✅ Attendre 2-3 minutes après mise à jour Zoom
- [ ] ✅ Test de l'URL OAuth via composant debug

## 🎯 URL de Callback Correcte

Pour votre setup actuel, l'URL exacte doit être :

```
https://03526871154.ngrok-free.app/auth/callback
```

**Sans aucune variation, espaces, ou caractères supplémentaires.**

---

💡 **Astuce :** Utilisez le composant de diagnostic dans Settings → Debug & API pour vérifier en temps réel que votre configuration est correcte avant de faire le test d'authentification Zoom.