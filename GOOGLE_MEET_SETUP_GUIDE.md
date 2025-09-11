# 🚀 Guide de Configuration Google Meet

## 📋 Pré-requis

- Compte Google (Gmail)
- Accès à [Google Cloud Console](https://console.cloud.google.com/)
- Application Centrinote avec Supabase configuré

---

## 🔧 Étape 1 : Google Cloud Console Setup

### 1.1 Créer un Projet Google Cloud

1. **Accéder à Google Cloud Console**
   - Aller sur https://console.cloud.google.com/
   - Se connecter avec votre compte Google

2. **Créer un nouveau projet**
   ```
   Nom du projet : centrinote-google-meet
   ID du projet : centrinote-meet-[random-id]
   ```

3. **Activer les APIs nécessaires**
   - Google Calendar API
   - Google Drive API (optionnel pour fichiers)
   - Google People API (pour profils utilisateurs)

### 1.2 Configuration OAuth 2.0

1. **Aller dans "APIs & Services" > "Credentials"**

2. **Créer des identifiants OAuth 2.0**
   ```
   Type d'application : Application Web
   Nom : Centrinote Google Meet Integration
   ```

3. **URLs de redirection autorisées**
   ```
   https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback (dev)
   https://centrinote.fr/auth/callback (prod)
   ```

4. **Domaines autorisés**
   ```
   localhost
   centrinote.fr
   wjzlicokhxitmeoxkjzv.supabase.co
   ```

### 1.3 Récupérer les Credentials

Après création, récupérer :
```
Client ID : [GOOGLE_CLIENT_ID]
Client Secret : [GOOGLE_CLIENT_SECRET]
```

---

## 🔐 Étape 2 : Configuration Supabase OAuth

### 2.1 Dashboard Supabase

1. **Aller dans Authentication > Providers**
2. **Activer Google Provider**
3. **Configurer les paramètres**
   ```
   Client ID : [GOOGLE_CLIENT_ID]
   Client Secret : [GOOGLE_CLIENT_SECRET]
   Scopes : openid email profile https://www.googleapis.com/auth/calendar
   ```

### 2.2 URLs de Redirection

1. **Site URL**
   ```
   https://centrinote.fr
   ```

2. **Redirect URLs**
   ```
   https://centrinote.fr/dashboard
   http://localhost:5173/dashboard (dev)
   ```

---

## 📝 Étape 3 : Variables d'Environnement

Ajouter au fichier `.env` :

```env
# 🔗 Google Meet Integration
VITE_GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
VITE_GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]

# Google APIs Configuration
VITE_GOOGLE_CALENDAR_API_KEY=[OPTIONAL_API_KEY]
VITE_GOOGLE_SCOPES=openid email profile https://www.googleapis.com/auth/calendar

# N8N Google Meet Webhook
VITE_N8N_GOOGLE_MEET_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/[NEW_WEBHOOK_ID]
```

---

## 🧪 Étape 4 : Test de Configuration

### 4.1 Test OAuth Flow

1. **URL de test manuelle**
   ```
   https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://centrinote.fr/dashboard
   ```

2. **Vérifications**
   - ✅ Redirection vers Google
   - ✅ Autorisation des scopes
   - ✅ Callback vers Supabase
   - ✅ Retour vers l'application

### 4.2 Test API Calendar

```javascript
// Test basique dans la console navigateur
const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
});
```

---

## 📋 Checklist Configuration

### Google Cloud Console
- [ ] Projet créé
- [ ] APIs activées (Calendar, Drive, People)
- [ ] Credentials OAuth 2.0 créés
- [ ] URLs de redirection configurées
- [ ] Client ID/Secret récupérés

### Supabase Dashboard
- [ ] Provider Google activé
- [ ] Client ID/Secret configurés
- [ ] Scopes configurés
- [ ] URLs de redirection configurées

### Variables d'Environnement
- [ ] VITE_GOOGLE_CLIENT_ID configuré
- [ ] VITE_GOOGLE_CLIENT_SECRET configuré
- [ ] VITE_GOOGLE_SCOPES configuré
- [ ] VITE_N8N_GOOGLE_MEET_WEBHOOK configuré

### Tests
- [ ] OAuth flow fonctionnel
- [ ] Tokens récupérables
- [ ] API Calendar accessible

---

## 🔒 Sécurité et Bonnes Pratiques

### ✅ Recommandations
- ✅ Utiliser HTTPS en production
- ✅ Restreindre les scopes aux besoins minimum
- ✅ Vérifier les domaines autorisés
- ✅ Monitorer les quotas API

### ⚠️ Attention
- ❌ Ne jamais exposer le Client Secret côté client
- ❌ Ne pas stocker les tokens en localStorage
- ❌ Ne pas commit les secrets dans Git

---

## 🆘 Dépannage

### Erreur : "redirect_uri_mismatch"
**Solution :** Vérifier les URLs de redirection dans Google Cloud Console

### Erreur : "access_denied"
**Solution :** Vérifier les scopes demandés vs configurés

### Erreur : "invalid_client"
**Solution :** Vérifier Client ID/Secret dans Supabase

### Tokens expirés
**Solution :** Implémenter le refresh automatique (géré par Supabase)

---

## 📞 Support

### 📖 Documentation Officielle
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth](https://supabase.com/docs/guides/auth/social-login/auth-google)

### 🔧 Outils de Debug
- Google Cloud Console > APIs & Services > Credentials
- Supabase Dashboard > Authentication > Users
- Chrome DevTools > Network (vérifier tokens)

---

## ✅ Prochaines Étapes

Une fois cette configuration terminée, nous passerons à :
1. **Implémentation des services** (googleMeetService.ts)
2. **Création des composants UI** (GoogleMeetManager.tsx)
3. **Hooks React** (useGoogleMeet.ts)
4. **Tests d'intégration**

**Status :** Configuration Google Cloud Console et Supabase OAuth à compléter avant de continuer.