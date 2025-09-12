# 🔐 Guide Configuration Google OAuth - Supabase

## 🚨 **Erreur Actuelle**
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

## ✅ **Solution : Configuration Complète**

### 1. **Google Cloud Console Setup**

#### A. Créer/Configurer le Projet
1. Allez sur : https://console.cloud.google.com/
2. Créez un nouveau projet ou sélectionnez existant
3. Nom suggéré : `Centrinote Google Meet`

#### B. Activer les APIs Requises
```
APIs & Services > Library > Rechercher et Activer :
✅ Google Calendar API
✅ Google OAuth2 API
✅ Google People API (optionnel)
```

#### C. Créer les Credentials OAuth 2.0
```
APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID

Application type: Web application
Name: Centrinote-GoogleMeet-Production

Authorized JavaScript origins:
- https://centrinote.netlify.app
- https://wjzlicokhxitmeoxkjzv.supabase.co
- http://localhost:5173 (pour développement)

Authorized redirect URIs:
- https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/callback
- https://centrinote.netlify.app/dashboard
- https://centrinote.netlify.app/auth/callback
- http://localhost:5173/dashboard (pour développement)
```

#### D. Récupérer les Credentials
```
Après création, vous obtenez :
- Client ID : 1234567890-abcdef.apps.googleusercontent.com
- Client Secret : GOCSPX-abcdefghijklmnop1234567890
```

### 2. **Configuration Supabase Dashboard**

#### A. Accéder aux Providers
```
1. https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv
2. Authentication > Providers
3. Trouvez "Google" dans la liste
```

#### B. Configurer Google Provider
```
✅ Enable sign in with Google: ON

Client ID (for OAuth):
→ Collez votre Google Client ID

Client Secret (for OAuth):
→ Collez votre Google Client Secret

Additional Scopes (optionnel):
→ https://www.googleapis.com/auth/calendar
```

#### C. Vérifier les URLs de Callback
```
Supabase génère automatiquement :
https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/callback

⚠️ Cette URL DOIT être dans Google Cloud Console !
```

### 3. **Variables d'Environnement**

#### A. Dans votre .env local
```env
# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop1234567890
VITE_GOOGLE_SCOPES=openid email profile https://www.googleapis.com/auth/calendar

# URLs de production
VITE_APP_URL=https://centrinote.netlify.app
```

#### B. Dans Netlify (Environment Variables)
```env
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop1234567890
VITE_GOOGLE_SCOPES=openid email profile https://www.googleapis.com/auth/calendar
VITE_APP_URL=https://centrinote.netlify.app
```

### 4. **Test de Configuration**

#### A. Vérification Supabase
```
1. Dashboard Supabase > Authentication > Providers
2. Google doit être "Enabled" avec un ✅ vert
3. Test avec un utilisateur test
```

#### B. Vérification URLs
```
✅ Google Cloud Console : Redirect URIs configurées
✅ Supabase Dashboard : Provider activé
✅ Variables d'env : Client ID/Secret configurés
```

## 🔄 **Ordre de Configuration (IMPORTANT !)**

```
1️⃣ Google Cloud Console (créer credentials)
2️⃣ Supabase Dashboard (activer provider + credentials)
3️⃣ Variables d'environnement (app + Netlify)
4️⃣ Test de connexion
```

## 🚨 **Erreurs Communes**

### Erreur: "provider is not enabled"
```
❌ Cause: Google provider pas activé dans Supabase
✅ Solution: Dashboard Supabase > Auth > Providers > Google > Enable
```

### Erreur: "redirect_uri_mismatch"
```
❌ Cause: URL de callback pas autorisée
✅ Solution: Ajouter l'URL dans Google Cloud Console
```

### Erreur: "invalid_client"
```
❌ Cause: Client ID/Secret incorrects
✅ Solution: Vérifier credentials dans Supabase Dashboard
```

## 🧪 **Test Manual**

### URL de Test Direct
```
https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://centrinote.netlify.app/dashboard

Si ça marche → Configuration OK ✅
Si erreur 400 → Provider pas activé ❌
```

## 📞 **Support**

Si le problème persiste après configuration :
1. Vérifiez les logs Supabase Dashboard > Logs
2. Testez avec un autre provider (GitHub) pour isoler le problème
3. Contactez le support Supabase si nécessaire

---
🤖 **Generated with [Claude Code](https://claude.ai/code)**