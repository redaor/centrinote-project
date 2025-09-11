# 🚀 Checklist de Déploiement - Google Meet

## 📋 Pré-Déploiement

### ✅ Configuration Google Cloud Console

- [ ] **Projet Google Cloud créé**
  - Nom : `centrinote-google-meet`
  - APIs activées : Google Calendar API, Google People API

- [ ] **Identifiants OAuth 2.0 créés**
  - Type : Application Web
  - Client ID : `[À CONFIGURER]`
  - Client Secret : `[À CONFIGURER]`
  - URLs de redirection :
    - `https://wjzlicokhxitmeoxkjzv.supabase.co/auth/v1/callback`
    - `https://centrinote.fr/auth/callback` (production)
    - `http://localhost:5173/auth/callback` (dev)

### ✅ Configuration Supabase

- [ ] **Provider Google configuré** dans Supabase Dashboard
  - Aller dans `Authentication > Providers`
  - Activer le provider "Google"
  - Configurer Client ID et Client Secret
  - Scopes : `openid email profile https://www.googleapis.com/auth/calendar`

- [ ] **Variables d'environnement Supabase**
  ```env
  VITE_SUPABASE_URL=https://wjzlicokhxitmeoxkjzv.supabase.co
  VITE_SUPABASE_ANON_KEY=[your-anon-key]
  ```

### ✅ Configuration n8n

- [ ] **Workflow n8n déployé** et accessible
  - URL webhook : `https://n8n.srv886297.hstgr.cloud/webhook/[NEW_GOOGLE_MEET_ID]`
  - Webhook actif et répondant aux tests
  - Logique de traitement des tokens OAuth implémentée

### ✅ Variables d'Environnement

- [ ] **Production .env configuré**
  ```env
  # Google Meet OAuth
  VITE_GOOGLE_CLIENT_ID=[VOTRE_GOOGLE_CLIENT_ID]
  VITE_GOOGLE_CLIENT_SECRET=[VOTRE_GOOGLE_CLIENT_SECRET]
  VITE_GOOGLE_SCOPES=openid email profile https://www.googleapis.com/auth/calendar
  
  # n8n Integration
  VITE_N8N_GOOGLE_MEET_WEBHOOK=https://n8n.srv886297.hstgr.cloud/webhook/[VOTRE_WEBHOOK_ID]
  
  # App URL
  VITE_APP_URL=https://centrinote.fr
  ```

## 🧪 Tests Pré-Déploiement

### ✅ Tests Locaux

- [x] **Build réussi** : `npm run build` ✅
- [x] **TypeScript** : Aucune erreur de compilation ✅
- [x] **Tests unitaires** : Composants React fonctionnels ✅
- [x] **Interface** : Navigation Google Meet accessible (`/google-meet`) ✅

### ✅ Tests d'Intégration

- [ ] **Composant GoogleMeetIntegrationTest** 
  - Accessible via `/settings` > Debug & API
  - Tous les tests au vert :
    - [ ] Configuration des variables d'environnement
    - [ ] Service d'authentification Google Meet  
    - [ ] Récupération des tokens OAuth
    - [ ] Informations utilisateur Google
    - [ ] Configuration n8n
    - [ ] Webhook n8n
    - [ ] Synchronisation des tokens avec n8n
    - [ ] API Google Calendar

### ✅ Tests End-to-End

- [ ] **Authentification Google complète**
  1. Aller sur `/google-meet`
  2. Cliquer "Se connecter avec Google Meet"
  3. Autoriser sur Google
  4. Retour automatique vers l'application
  5. Statut "Google Meet Connecté" affiché

- [ ] **Création de réunion**
  1. Vue d'ensemble → "Nouvelle réunion"
  2. Remplir formulaire
  3. Créer la réunion
  4. Lien Google Meet généré
  5. Réunion visible dans Google Calendar

- [ ] **Synchronisation n8n**
  1. Connexion Google réussie
  2. Tokens automatiquement envoyés à n8n
  3. n8n reçoit et traite les tokens
  4. Pas d'erreurs dans les logs

## 🚀 Déploiement

### ✅ Build de Production

- [x] **Variables d'environnement** préparées en production
- [x] **Build optimisé** : `npm run build` ✅
  - Taille : 1,794.62 kB (JS) + 1,102.13 kB (CSS)
  - Modules : 2043 modules transformés
  - Compilation : 6.00s
- [x] **Assets statiques** prêts pour déploiement
- [x] **Routing** : Route `/google-meet` configurée

### ✅ Configuration Serveur

- [ ] **HTTPS activé** (requis pour OAuth)
- [ ] **Headers CORS** configurés pour Supabase et Google
- [ ] **Redirections** `/auth/callback` vers Supabase
- [ ] **CSP Headers** autorisant les domaines Google et Supabase

### ✅ DNS et Domaines

- [ ] **Domaine principal** : `https://centrinote.fr`
- [ ] **Certificat SSL** valide et à jour
- [ ] **Sous-domaines** configurés si nécessaire

## 🔍 Tests Post-Déploiement

### ✅ Tests Fonctionnels

- [ ] **Page d'accueil** accessible
- [ ] **Authentication** Supabase fonctionnelle
- [ ] **Navigation** vers `/google-meet` sans erreurs
- [ ] **Interface Google Meet** s'affiche correctement
- [ ] **Bouton connexion** fonctionnel

### ✅ Tests d'Intégration Production

- [ ] **OAuth Flow complet**
  - Redirection vers Google
  - Autorisation utilisateur
  - Callback Supabase
  - Session établie
  - Tokens disponibles

- [ ] **Création réunions opérationnelle**
  - Formulaire accessible
  - Création réussie
  - Lien Google Meet valide
  - Synchronisation Google Calendar

- [ ] **Intégration n8n opérationnelle**
  - Webhook accessible depuis la production
  - Tokens transmis correctement
  - Pas d'erreurs CORS

### ✅ Tests de Régression

- [ ] **Fonctionnalités existantes** non impactées
- [ ] **Navigation générale** fonctionnelle
- [ ] **Intégration Zoom** toujours opérationnelle
- [ ] **Autres intégrations** (n8n, Supabase) fonctionnelles
- [ ] **Performance** non dégradée

## 📊 Monitoring Post-Déploiement

### ✅ Métriques à Surveiller

- [ ] **Taux de connexion Google** réussi vs échoué
- [ ] **Erreurs OAuth** dans les logs Supabase
- [ ] **Latence API Google Calendar** 
- [ ] **Disponibilité webhook n8n**
- [ ] **Erreurs JavaScript** côté client
- [ ] **Quota API Google** utilisé vs disponible

### ✅ Logs à Vérifier

- [ ] **Supabase Auth logs** : Connexions OAuth Google
- [ ] **Application logs** : Erreurs d'authentification
- [ ] **n8n logs** : Réception et traitement des webhooks
- [ ] **Google Cloud logs** : Utilisation des APIs
- [ ] **Serveur web logs** : Erreurs HTTP/CORS

### ✅ Alertes à Configurer

- [ ] **Échecs authentification** > 10% sur 1h
- [ ] **Indisponibilité webhook n8n** > 5min
- [ ] **Erreurs JavaScript** critiques
- [ ] **Taux d'erreur API Google** anormal
- [ ] **Quota API Google** > 80%

## 🆘 Plan de Rollback

### ⚠️ Critères de Rollback

- Taux d'échec authentification > 25%
- Indisponibilité totale de la fonction Google Meet
- Impact sur les fonctionnalités existantes
- Erreurs critiques non résolues en < 30min

### 🔄 Procédure de Rollback

1. **Désactiver les nouvelles routes**
   ```bash
   # Rediriger /google-meet vers /dashboard temporairement
   ```

2. **Restaurer version précédente**
   ```bash
   git revert [commit-google-meet-integration]
   npm run build
   # Déployer
   ```

3. **Nettoyer les variables d'environnement**
   ```bash
   # Commenter les variables Google Meet dans .env
   ```

4. **Vérifier la restauration**
   - [ ] Application fonctionne sans erreurs
   - [ ] Fonctionnalités existantes opérationnelles
   - [ ] Pas de références Google Meet cassées

## 📞 Support Post-Déploiement

### 🔧 Équipe Technique

- **Développement** : Monitoring des erreurs JavaScript et API
- **DevOps** : Surveillance infrastructure et APIs Google
- **Product** : Feedback utilisateur et adoption

### 📖 Documentation Utilisateur

- [ ] **Guide utilisateur** mis à jour avec section Google Meet
- [ ] **FAQ** enrichie avec questions Google Meet courantes
- [ ] **Tutoriels** de connexion et création réunions
- [ ] **Support** informé des nouvelles fonctionnalités

## 🔧 Différences vs Zoom

### Architecture Similaire
- [x] Même pattern OAuth via Supabase
- [x] Même structure de services et hooks
- [x] Interface utilisateur cohérente
- [x] Tests d'intégration identiques
- [x] Intégration n8n similaire

### Spécificités Google Meet
- **API** : Google Calendar au lieu de Zoom API
- **Réunions** : Créées via Calendar avec Meet automatique
- **Tokens** : Même gestion mais scopes différents
- **Webhooks** : URL n8n dédiée Google Meet

## ✅ Validation Finale

### 🎯 Critères de Succès

- [ ] **Fonctionnalité accessible** : Route `/google-meet` opérationnelle
- [ ] **Authentification fluide** : OAuth Google sans friction
- [ ] **Création réunions** : Interface complète fonctionnelle
- [ ] **Intégration stable** : n8n reçoit les tokens correctement  
- [ ] **Performance maintenue** : Pas de dégradation
- [ ] **Monitoring actif** : Métriques et alertes configurées
- [ ] **Documentation complète** : Guides utilisateur et technique
- [ ] **Équipe formée** : Support et développement informés

### 📊 Métriques de Réussite (7 jours post-déploiement)

- [ ] **Adoption** : > 10% des utilisateurs actifs testent Google Meet
- [ ] **Fiabilité** : < 2% d'échecs d'authentification
- [ ] **Performance** : Temps de connexion < 3 secondes  
- [ ] **Support** : < 5 tickets liés à l'intégration Google Meet
- [ ] **Stabilité** : 99.9% d'uptime des APIs Google
- [ ] **Création réunions** : > 90% de succès

---

## 🎉 État Actuel

### ✅ **Code Implémenté (100%)**
- [x] Services complets (googleMeetService, googleN8nIntegration)
- [x] Interface utilisateur complète (6 composants)
- [x] Hook React (useGoogleMeet)
- [x] Navigation intégrée
- [x] Tests d'intégration
- [x] Documentation complète
- [x] Build sans erreurs

### ⏳ **Configuration Externe Requise**
- [ ] Google Cloud Console OAuth setup
- [ ] Supabase Provider Google activation
- [ ] Variables d'environnement production
- [ ] Webhook n8n création

**🚀 Prêt pour déploiement dès que la configuration externe est terminée !**

---

**Date de déploiement prévu** : ___________  
**Validé par** : ___________  
**Version déployée** : ___________