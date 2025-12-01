# 📊 Analyse Complète de l'Application CentriNote

## 🎯 Vue d'ensemble

**CentriNote** est une plateforme SaaS de gestion de connaissances et de productivité qui combine :
- **Gestion de notes** et vocabulaire
- **Réunions vidéo** avec transcription et résumés IA
- **Assistant IA** avec mémoire persistante
- **Automatisations** personnalisables
- **Système de quotas** basé sur les plans d'abonnement

**Stack technique :**
- **Frontend** : React 18 + TypeScript + Vite
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions)
- **Vidéo** : Daily.co (WebRTC)
- **Paiements** : Stripe
- **IA** : OpenAI (GPT-4o-mini, GPT-4)
- **Déploiement** : Netlify (statique) + Supabase Edge Functions

---

## 🔐 1. Système d'Authentification

### Méthodes disponibles

1. **Email/Password** (classique)
   - Inscription avec confirmation email
   - Connexion avec gestion d'erreurs en français
   - Vérification email obligatoire

2. **Magic Link** (lien magique)
   - Connexion sans mot de passe
   - Envoi d'email avec lien de connexion
   - Redirection vers `/auth/confirm` après clic

3. **Mot de passe oublié**
   - Modal "Mot de passe oublié"
   - Envoi d'email de réinitialisation
   - Page `/auth/reset-mot-de-passe` pour définir nouveau mot de passe
   - Vérification JWT avant changement

### Implémentation

- **Service** : `src/services/authService.js`
- **Composant** : `src/components/AuthForm.tsx`
- **Provider** : `src/components/AuthProvider.tsx`
- **Hook** : `src/hooks/useSupabaseAuth.ts`
- **Backend** : Supabase Auth avec RLS (Row Level Security)

### Sécurité

- Vérification email obligatoire (`email_confirmed_at`)
- Gestion des erreurs en français
- Protection contre les attaques brute-force (rate limiting)
- JWT tokens pour authentification

---

## 💳 2. Système de Plans et Paiements

### Plans disponibles

1. **Free** (Gratuit)
   - Notes illimitées (texte brut)
   - 50 mots vocabulaire
   - 1 réunion 45 min + résumé IA
   - 1 automation
   - 3 participants max par réunion

2. **Starter** (⭐ POPULAIRE) - 9.99€/mois (promo : 23% de réduction)
   - 150k tokens IA
   - 10 réunions 45 min
   - 8 participants max par réunion
   - 5 résumés IA
   - 100 mots vocabulaire
   - 5 automations

3. **Pro** - 19.99€/mois (promo : 33% de réduction)
   - 600k tokens IA
   - 20 réunions 60 min
   - 15 participants max par réunion
   - Résumés IA illimités
   - 500 mots vocabulaire
   - Automations illimitées

4. **Teams** - 39.99€/mois (promo : 20% de réduction)
   - Tokens IA illimités
   - 60 réunions 60 min
   - 20 participants
   - Résumés IA illimités
   - Vocabulaire illimité
   - Automations illimitées
   - Admin dashboard
   - Support prioritaire

### Implémentation

- **Configuration** : `src/config/planPrices.ts`
- **Service checkout** : `src/services/planCheckoutService.ts`
- **Page plans** : `src/pages/PlanPage.tsx`
- **Composant plans** : `src/components/plan/PlanPlans.tsx`
- **Edge Function** : `supabase/functions/stripe-checkout/index.ts`
- **Webhook** : `supabase/functions/stripe-webhook/index.ts`

### Système de quotas

- **Tables** : `subscription_plans`, `user_subscriptions`, `user_quotas`
- **Fonctions SQL** : `check_quota()`, `increment_quota()`
- **Mapping Stripe** : `stripe_price_mapping` (price_id → plan_name)
- **Composant** : `src/components/quota/QuotaBar.tsx`

### Flux de paiement

1. Utilisateur sélectionne un plan sur `/plan`
2. Redirection vers Stripe Checkout (via Edge Function)
3. Paiement sur Stripe
4. Webhook Stripe → mise à jour `user_subscriptions`
5. Activation automatique du plan

---

## 📝 3. Gestion de Notes

### Fonctionnalités

- **Création/Édition/Suppression** de notes
- **Tags** personnalisables avec couleurs
- **Épinglage** de notes importantes
- **Recherche** dans les notes
- **Filtrage** par tags
- **Pièces jointes** (attachments)
- **Affichage** : grille ou liste

### Implémentation

- **Service** : `src/services/notesService.ts`
- **Hook** : `src/hooks/useNotes.ts`
- **Composants** :
  - `src/components/documents/ModernNotesManager.tsx` (interface moderne)
  - `src/components/documents/NotesManager.tsx` (interface classique)
- **Tables Supabase** :
  - `notes` (id, userId, title, content, is_pinned, created_at, updated_at)
  - `tags` (id, name, color, user_id)
  - `note_tags` (liaison many-to-many)
  - `note_attachments` (pièces jointes)

### Caractéristiques techniques

- **RLS** activé (chaque utilisateur voit uniquement ses notes)
- **Cache** côté client pour performance
- **Recherche** full-text dans titre et contenu
- **Tri** par date de mise à jour ou épinglage

---

## 📚 4. Vocabulaire (Apprentissage)

### Fonctionnalités

- **Ajout** de mots avec définition, prononciation, exemples
- **Catégories** personnalisables
- **Niveau de maîtrise** (0-100%)
- **Difficulté** (1-5)
- **Révision** : mode flashcard, quiz
- **Statistiques** : mots maîtrisés, oubliés, streak
- **Badges** de progression

### Implémentation

- **Service** : `src/services/vocabularyService.ts`
- **Hook** : `src/hooks/useVocabulary.ts`
- **Composants** :
  - `src/components/vocabulary/VocabularyNotebook.tsx` (interface classique)
  - `src/components/vocabulary/NeuroVocabulary.tsx` (interface gamifiée)
  - `src/components/vocabulary/FlashcardMode.tsx` (révision)
- **Table Supabase** : `vocabulary` (id, userId, word, definition, pronunciation, category, examples, difficulty, mastery, last_reviewed, times_reviewed)

### Modes de révision

1. **Flashcard** : cartes recto/verso
2. **Quiz** : questions à choix multiples
3. **Filtrage** : par maîtrise, difficulté, catégorie, date

---

## 🎥 5. Réunions Vidéo (Daily.co)

### Fonctionnalités

- **Création** de réunions avec titre, description, participants
- **Planification** avec date/heure
- **Salle vidéo** intégrée (Daily.co WebRTC)
- **Enregistrement** automatique (cloud)
- **Transcription** automatique de l'audio
- **Résumé IA** généré automatiquement
- **Gestion participants** : ajout, suppression, invitations
- **Statuts** : scheduled, active, completed, cancelled

### Implémentation

- **Composants** :
  - `src/components/meetings/MeetingList.tsx` (liste des réunions)
  - `src/components/meetings/MeetingRoom.tsx` (salle vidéo)
  - `src/components/meetings/MeetingScheduler.tsx` (planification)
  - `src/components/meetings/MeetingSummary.tsx` (résumé)
- **Hooks** :
  - `src/hooks/useMeetings.tsx` (gestion réunions)
  - `src/hooks/useDaily.ts` (intégration Daily.co)
  - `src/hooks/useRecordingPolling.ts` (polling enregistrement)
  - `src/hooks/useSummary.ts` (polling résumé IA)
- **Services** :
  - `src/lib/daily.ts` (client Daily.co)
- **Edge Functions** :
  - `netlify/functions/create-meeting-v3.js` (création salle)
  - `netlify/functions/generate-summary-auto.js` (transcription + résumé IA)
- **Tables Supabase** :
  - `meetings` (id, room_name, room_url, title, description, scheduled_at, participants, status, recording_url, transcript, ai_summary)
  - `meeting_summaries` (résumés détaillés)

### Flux de réunion

1. **Création** : formulaire → Edge Function → Daily.co API → Supabase
2. **Démarrage** : clic "Démarrer la réunion" → intégration Daily.co → WebRTC
3. **Enregistrement** : activé automatiquement (cloud)
4. **Fin** : webhook Daily.co → transcription audio → résumé IA → mise à jour `meetings`
5. **Affichage** : résumé disponible dans `/meetings/:id/summary`

---

## 🤖 6. Assistant IA (Recherche IA)

### Fonctionnalités principales

1. **Chat IA** avec contexte personnalisé
   - Utilise les notes et vocabulaire de l'utilisateur
   - Recherche web (Brave Search API) si nécessaire
   - Citations des sources (notes, vocabulaire, web)

2. **Mémoire persistante** entre sessions
   - Résumé des conversations précédentes
   - Concepts clés mémorisés
   - Langue détectée automatiquement
   - Fonction "souviens-toi" : mémorisation explicite

3. **Reconnaissance vocale** (Web Speech API)
   - Bouton micro (🎤) à côté du champ de recherche
   - Transcription automatique
   - Envoi automatique après transcription

4. **Analyse de documents**
   - Upload de fichiers (PDF, DOCX, TXT)
   - Extraction de texte
   - Questions sur le document

### Implémentation

- **Composant principal** : `src/components/ai/AIChat.tsx`
- **Page** : `src/pages/AISearchPage.tsx` (route `/search`)
- **Hooks** :
  - `src/hooks/useCentrinoteAI_Edge.ts` (appel Edge Function)
  - `src/hooks/useCentrinoteAI.ts` (SDK OpenAI direct)
- **Edge Functions** :
  - `supabase/functions/ai-chat/index.ts` (chat principal avec enrichissement)
  - `supabase/functions/ai-memory/index.ts` (génération mémoire persistante)
- **Services** :
  - `src/services/ai/userData/UserDataLoader.ts` (chargement notes/vocabulaire)
  - `src/services/aiConversationService.ts` (sauvegarde conversations)
- **Tables Supabase** :
  - `chat_history` (historique des messages)
  - `chat_memory` (mémoire persistante : summary, key_topics, language, mood)
  - `ai_conversations` (sessions de conversation)

### Fonctionnalités avancées

- **Détection langue** : français, arabe, anglais, etc.
- **Support arabe** : réponse avec ligatures correctes
- **Recherche web** : Brave Search API pour informations actualisées
- **Enrichissement contexte** : notes récentes, vocabulaire maîtrisé
- **Actions IA** : mise à jour vocabulaire, création notes (via parsing)

---

## ⚙️ 7. Automatisations

### Types d'automatisations

1. **Révisions**
   - Révision quotidienne (rappel à heure fixe)
   - Milestone vocabulaire (célébration à 50/100/200 mots)
   - Notes oubliées (rappel si non consultées depuis 7 jours)

2. **Rappels**
   - Rappel d'étude (à heure fixe)
   - Rappel de pause (après X minutes d'étude)

3. **Résumés**
   - Résumé hebdomadaire (email avec synthèse)
   - Rapport mensuel (statistiques complètes)

4. **Sauvegardes**
   - Sauvegarde automatique (export données)

### Implémentation

- **Composants** :
  - `src/components/automation/SimpleAutomationDashboard.tsx` (interface IFTTT-like)
  - `src/components/automation/AutomationManager.tsx` (gestionnaire complet)
  - `src/components/automation/AutomationBuilder.tsx` (constructeur visuel)
- **Edge Functions** :
  - `supabase/functions/automation-scheduler/index.ts` (planificateur principal)
  - `supabase/functions/automation-micro-runner/index.ts` (exécution micro-templates)
  - `supabase/functions/automation-runner/index.ts` (exécution automations complexes)
- **Tables Supabase** :
  - `automations` (id, user_id, name, trigger_type, trigger_config, action_type, action_config, is_active, last_executed_at, next_execution_at)
  - `automation_logs` (logs d'exécution)
  - `scheduler_locks` (verrous pour éviter exécutions multiples)

### Système de verrous

- **Verrou global** : empêche plusieurs instances du scheduler
- **Verrou par automation** : empêche exécutions simultanées d'une même automation
- **Fonctions SQL** :
  - `try_lock_scheduler()` : verrou global
  - `try_lock_and_update_automation()` : verrou atomique + mise à jour

---

## 👥 8. Collaboration

### Fonctionnalités

- **Sessions d'étude** en temps réel
- **Chat** intégré
- **Partage de documents**
- **Rapports** de session

### Implémentation

- **Composant** : `src/components/collaboration/Collaboration.tsx`
- **Route** : `/collaboration`

---

## 📊 9. Administration

### Fonctionnalités admin

1. **Messages Support**
   - Liste des messages utilisateurs
   - Statuts : nouveau, en cours, résolu
   - Suppression de messages
   - Filtrage par statut

2. **Logs d'erreurs**
   - Affichage en temps réel (Supabase Realtime)
   - Filtrage par niveau (info, warn, error, debug)
   - Recherche dans les logs
   - Statistiques (total, erreurs, avertissements)
   - Suppression de logs (admin uniquement)

### Implémentation

- **Page** : `src/pages/admin/SupportMessagesPage.tsx`
- **Composants** :
  - `src/components/admin/ErrorLogsDashboard.tsx` (logs d'erreurs)
  - `src/components/admin/AdminFloatingButton.tsx` (bouton flottant admin)
- **Tables Supabase** :
  - `support_messages` (id, name, email, subject, message, status, created_at)
  - `error_logs` (id, user_id, message, level, meta, source, stack_trace, url, user_agent, created_at)
- **Edge Functions** :
  - `supabase/functions/log-error/index.ts` (réception logs frontend)

### Accès admin

- Vérification par email : `contact@centrinote.fr` ou `reda_sahraoui@outlook.fr`
- Vérification par rôle : `profiles.role = 'admin'`

---

## 🎨 10. Interface Utilisateur

### Design System

- **Framework CSS** : Tailwind CSS
- **Icônes** : Lucide React
- **Animations** : Framer Motion
- **Thème** : Mode sombre/clair (synchronisé avec BDD)
- **Taille texte** : Personnalisable (s, m, l)

### Composants UI

- **Toast** : notifications temporaires
- **Modal** : confirmations, formulaires
- **Cards** : notes, vocabulaire, réunions
- **Badges** : statuts, tags
- **Loading states** : spinners, skeletons

### Responsive

- **Mobile-first** : design adaptatif
- **Breakpoints** : Tailwind (sm, md, lg, xl)

---

## 🔧 11. Architecture Backend

### Supabase Edge Functions

1. **ai-chat** : Chat IA avec enrichissement contexte
2. **ai-memory** : Génération mémoire persistante
3. **stripe-checkout** : Création session Stripe
4. **stripe-webhook** : Gestion événements Stripe
5. **automation-scheduler** : Planificateur automations
6. **automation-micro-runner** : Exécution micro-templates
7. **log-error** : Réception logs frontend
8. **automation-access** : Vérification accès automations

### Netlify Functions (Legacy)

- `create-meeting-v3.js` : Création salle Daily.co
- `generate-summary-auto.js` : Transcription + résumé IA
- `transcribe-audio.js` : Transcription audio

### Base de données (PostgreSQL)

**Tables principales :**
- `profiles` : Profils utilisateurs
- `notes`, `tags`, `note_tags` : Système de notes
- `vocabulary` : Vocabulaire
- `meetings`, `meeting_summaries` : Réunions
- `automations`, `automation_logs` : Automatisations
- `subscription_plans`, `user_subscriptions`, `user_quotas` : Plans et quotas
- `chat_history`, `chat_memory` : IA et conversations
- `support_messages`, `error_logs` : Support et monitoring
- `ai_conversations` : Sessions IA

**Sécurité :**
- **RLS** activé sur toutes les tables
- **Policies** : utilisateurs voient uniquement leurs données
- **Service role** : accès admin pour Edge Functions

---

## 📱 12. Pages et Routes

### Pages publiques

- `/` : Landing page
- `/auth` : Connexion/Inscription
- `/register?plan=...` : Redirection vers auth avec plan
- `/launch` : Page de lancement (promo)
- `/privacy-policy`, `/terms-of-service`, `/legal-mentions`, `/faq`, `/support` : Pages légales
- `/forum` : Forum communautaire
- `/guide` : Guide utilisateur

### Pages protégées

- `/dashboard` : Tableau de bord
- `/notes` : Gestion de notes
- `/vocabulary` : Vocabulaire
- `/meetings` : Liste des réunions
- `/meetings/new` : Créer une réunion
- `/meeting/:id` : Salle de réunion
- `/meetings/:id/summary` : Résumé de réunion
- `/search` : Recherche IA
- `/plan` : Plans d'abonnement
- `/planning` : Planification d'étude
- `/automation` : Automatisations
- `/settings` : Paramètres
- `/help` : Aide
- `/admin/support` : Messages support (admin)

---

## 🛠️ 13. Services et Utilitaires

### Services principaux

- `notesService.ts` : CRUD notes
- `vocabularyService.ts` : CRUD vocabulaire
- `planCheckoutService.ts` : Checkout Stripe
- `stripeCheckout.ts` : Service Stripe (legacy)
- `automationService.ts` : Gestion automations
- `quotaService.ts` : Vérification quotas
- `aiConversationService.ts` : Sauvegarde conversations IA
- `webhookService.ts` : Appels webhooks N8N

### Utilitaires

- `logger.ts` : Logger sécurisé (sanitisation données sensibles)
- `disableTranslate.ts` : Désactivation Google Translate
- `formHelper.ts` : Helpers formulaires

---

## 🔒 14. Sécurité

### Mesures implémentées

1. **Authentification**
   - JWT tokens (Supabase Auth)
   - Vérification email obligatoire
   - Rate limiting (Supabase)

2. **Données sensibles**
   - Logger sécurisé : sanitisation emails, UUIDs, tokens, passwords
   - Pas de logs en console en production
   - Envoi logs vers `error_logs` (sanitisés)

3. **RLS (Row Level Security)**
   - Toutes les tables protégées
   - Policies : utilisateurs voient uniquement leurs données
   - Service role pour Edge Functions

4. **CORS**
   - Headers CORS configurés dans Edge Functions
   - Origines autorisées : `https://centrinote.fr`, `https://www.centrinote.fr`

---

## 📈 15. Performance

### Optimisations

1. **Frontend**
   - Code-splitting (Vite)
   - Lazy loading composants
   - Cache côté client (notes, vocabulaire)
   - Debouncing recherches

2. **Backend**
   - Index SQL sur colonnes fréquemment requêtées
   - Requêtes optimisées (JOINs au lieu de multiples requêtes)
   - Pagination pour grandes listes

3. **IA**
   - Timeout 5s pour chargement données utilisateur
   - Limitation tokens contexte (3000-5000)
   - Cache promo status

---

## 🎯 16. Fonctionnalités Spéciales

### Mémoire persistante IA

- **Table** : `chat_memory` (summary, key_topics, language, mood)
- **Chargement** : dernière mémoire par `user_id` (peu importe session)
- **Mise à jour** : toutes les 5 messages (fire & forget)
- **Fonction "souviens-toi"** : mémorisation explicite via commande

### Reconnaissance vocale

- **API** : Web Speech API (natif navigateur)
- **Compatibilité** : Chrome/Edge uniquement
- **Intégration** : bouton micro dans champ recherche IA
- **Flux** : écoute → transcription → remplissage champ → envoi automatique

### Système de quotas

- **Vérification** : avant chaque action (réunion, résumé IA, automation)
- **Incrémentation** : après chaque utilisation
- **Limites** : définies dans `subscription_plans`
- **Composant** : barre de progression visuelle

---

## 📦 17. Déploiement

### Configuration

- **Frontend** : Netlify (statique, dossier `dist/`)
- **Backend** : Supabase Edge Functions
- **Script** : `deploy.sh` (commit + build + déploiement manuel)
- **Workflow** : `.github/workflows/manual-deploy.yml` (déclenchement manuel uniquement)

### Stratégie minimaliste

- **0 crédit Netlify** tant qu'on ne déploie pas
- **Build local** avant déploiement
- **Déploiement manuel** via CLI ou GitHub Actions
- **Pas de builds automatiques** (désactivés)

---

## 🎨 18. Design et UX

### Thème

- **Mode sombre/clair** : synchronisé avec BDD
- **Taille texte** : personnalisable (s, m, l)
- **Palette** : tons pastels, modernes, harmonieux
- **Animations** : transitions douces (150ms ease)

### Sections visuelles

- **Réunions** : cartes avec gradients subtils, badges pastels, ombres douces
- **Notes** : fonds neutres (#FAFBFC), bordures #E5E9F2, accents bleu pastel
- **Vocabulaire** : interface gamifiée avec badges, statistiques, quiz

---

## 📊 19. Statistiques et Monitoring

### Logs d'erreurs

- **Table** : `error_logs`
- **Niveaux** : info, warn, error, debug
- **Métadonnées** : source, stack trace, URL, user agent
- **Temps réel** : Supabase Realtime
- **Nettoyage** : automatique après 30 jours

### Support

- **Table** : `support_messages`
- **Statuts** : nouveau, en cours, résolu
- **Interface admin** : gestion complète

---

## 🔄 20. Intégrations Externes

### APIs utilisées

1. **Daily.co** : Vidéo conférence WebRTC
2. **OpenAI** : GPT-4o-mini, GPT-4 (chat, résumés, mémoire)
3. **Stripe** : Paiements et abonnements
4. **Brave Search** : Recherche web pour IA
5. **Supabase** : Backend complet (DB, Auth, Storage, Edge Functions)

### Webhooks

- **Daily.co** → Netlify Functions : événements réunion (recording ready)
- **Stripe** → Supabase Edge Function : événements paiement
- **N8N** (optionnel) : workflows automations

---

## 📝 21. Fonctionnalités Futures (Architecture préparée)

### Modules prévus

- **Zoom** : Intégration réunions Zoom (structure prête)
- **Collaboration** : Sessions d'étude (déjà implémenté)
- **Forum** : Communauté (déjà implémenté)

### Feature Flags

- Architecture modulaire prête pour activation/désactivation de modules

---

## ✅ Résumé des Fonctionnalités Principales

| Fonctionnalité | Description | Route/Page |
|----------------|-------------|------------|
| **Authentification** | Email/password, Magic Link, Reset password | `/auth` |
| **Notes** | CRUD notes, tags, recherche, filtrage | `/notes` |
| **Vocabulaire** | Apprentissage mots, flashcards, quiz | `/vocabulary` |
| **Réunions** | Vidéo conférence, transcription, résumé IA | `/meetings` |
| **Recherche IA** | Chat IA avec mémoire, recherche web, analyse docs | `/search` |
| **Plans** | Free, Starter, Pro, Teams avec Stripe | `/plan` |
| **Automatisations** | Révisions, rappels, résumés, sauvegardes | `/automation` |
| **Planification** | Planning d'étude, tâches | `/planning` |
| **Collaboration** | Sessions d'étude, chat temps réel | `/collaboration` |
| **Forum** | Communauté, posts, réponses | `/forum` |
| **Admin** | Messages support, logs d'erreurs | `/admin/support` |
| **Paramètres** | Profil, apparence, notifications, sécurité | `/settings` |

---

**Date d'analyse** : 2025-01-02  
**Version application** : Production  
**Stack** : React + TypeScript + Vite + Supabase + Daily.co + Stripe + OpenAI

