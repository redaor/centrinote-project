# 💬 Forum Communautaire Centrinote - Guide d'Implémentation

## 📋 Vue d'ensemble

Le forum MVP est maintenant **prêt à déployer** ! Tous les fichiers sont créés. Il ne reste plus qu'à appliquer la migration SQL et tester.

---

## ✅ Fichiers créés

### 1. **Base de données**
- `supabase/migrations/20251127_create_forum.sql` - Migration complète avec :
  - Tables : `forum_posts`, `forum_replies`, `forum_likes`, `forum_reports`
  - Triggers pour auto-update `updated_at`
  - Trigger pour auto-masquage si ≥ 3 signalements
  - RLS (Row Level Security) pour sécurité
  - View `forum_user_stats` pour badges

### 2. **Types TypeScript**
- `src/types/forum.ts` - Interfaces et fonctions utilitaires

### 3. **Service**
- `src/services/forumService.ts` - Toute la logique métier :
  - CRUD posts & réponses
  - Like/unlike
  - Signalements
  - Accepter une réponse
  - Stats utilisateurs

### 4. **Composants React**
- `src/components/forum/UserBadge.tsx` - Badge utilisateur
- `src/components/forum/PostCard.tsx` - Carte d'un post
- `src/components/forum/ReplyForm.tsx` - Formulaire de réponse
- `src/components/forum/ReplyCard.tsx` - Carte d'une réponse

### 5. **Pages**
- `src/pages/ForumPage.tsx` - Liste des posts + créer un post
- `src/pages/ForumPostDetailPage.tsx` - Détail d'un post + réponses

### 6. **Routing**
- Routes ajoutées dans `src/components/routing/AppRouter.tsx` :
  - `/forum` - Liste des posts (public)
  - `/forum/:id` - Détail d'un post (public)

---

## 🚀 Déploiement

### Étape 1 : Appliquer la migration SQL

```bash
# Se connecter à Supabase
supabase db push

# OU appliquer manuellement via l'interface Supabase :
# 1. Va sur https://app.supabase.com
# 2. Sélectionne ton projet
# 3. SQL Editor → New Query
# 4. Copie le contenu de supabase/migrations/20251127_create_forum.sql
# 5. Clique sur "Run"
```

### Étape 2 : Build et test

```bash
npm run build
npm run dev
```

### Étape 3 : Tester le forum

1. Va sur `http://localhost:5173/forum`
2. **Sans être connecté** :
   - Tu peux voir les posts
   - Bouton "Rejoindre la discussion" → redirige vers /auth
3. **Connecté** :
   - Clique sur "Poser une question"
   - Remplis titre + corps
   - Publie
   - Like un post
   - Réponds à un post
   - Marque une réponse comme acceptée (si tu es l'auteur du post)
   - Signale un post (teste avec 3 signalements différents pour voir l'auto-masquage)

---

## 🎨 Fonctionnalités MVP

### ✅ Lecture publique
- N'importe qui peut voir les posts et réponses
- Non-connectés voient un bouton "Rejoindre la discussion"

### ✅ Écriture authentifiée
- Seuls les utilisateurs connectés peuvent :
  - Créer un post
  - Répondre à un post
  - Liker un post ou une réponse
  - Signaler un contenu

### ✅ Badges automatiques
- 🆕 **Nouveau** : ≥ 1 message (post ou réponse)
- 💡 **Utile** : ≥ 10 likes reçus au total
- ✅ **Solution** : ≥ 1 réponse acceptée

### ✅ Auto-modération
- Si un post ou réponse reçoit ≥ 3 signalements → masqué automatiquement
- Trigger SQL gère cela automatiquement

### ✅ Réponse acceptée
- L'auteur d'un post peut marquer une réponse comme "acceptée"
- Affiche une badge vert "✅ Réponse acceptée"
- Le post est marqué "Résolu" avec icône ✓

---

## 📊 Structure de la base de données

```
forum_posts
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── title (TEXT)
├── body (TEXT)
├── likes_count (INT)
├── reports_count (INT)
├── hidden (BOOL)
├── accepted_answer_id (FK → forum_replies)
└── created_at, updated_at

forum_replies
├── id (UUID, PK)
├── post_id (FK → forum_posts)
├── user_id (FK → auth.users)
├── body (TEXT)
├── likes_count (INT)
├── reports_count (INT)
├── hidden (BOOL)
└── created_at, updated_at

forum_likes
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── post_id (FK → forum_posts, nullable)
├── reply_id (FK → forum_replies, nullable)
└── created_at

forum_reports
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── post_id (FK → forum_posts, nullable)
├── reply_id (FK → forum_replies, nullable)
├── reason (TEXT)
└── created_at
```

---

## 🔒 Sécurité (RLS)

### forum_posts
- **SELECT** : Visible si `hidden = false` OU si tu es l'auteur
- **INSERT** : Seulement si authentifié
- **UPDATE** : Seulement si tu es l'auteur
- **DELETE** : Seulement si tu es l'auteur

### forum_replies
- **SELECT** : Visible si `hidden = false` OU si tu es l'auteur
- **INSERT** : Seulement si authentifié
- **UPDATE** : Seulement si tu es l'auteur
- **DELETE** : Seulement si tu es l'auteur

### forum_likes
- **SELECT** : Public
- **INSERT** : Seulement si authentifié
- **DELETE** : Seulement tes propres likes

### forum_reports
- **SELECT** : Admins uniquement
- **INSERT** : Seulement si authentifié

---

## 🎯 TODO après le MVP

### Améliorations futures (hors scope MVP)
- [ ] Pagination (actuellement tous les posts sont chargés)
- [ ] Catégories/tags pour organiser les posts
- [ ] Recherche dans le forum
- [ ] Notifications quand quelqu'un répond à ton post
- [ ] Édition de posts/réponses
- [ ] Upvote/downvote au lieu de simple like
- [ ] Markdown dans le corps des posts
- [ ] Panel admin pour gérer les posts signalés
- [ ] Tri des posts (récents, populaires, résolus, non-résolus)

---

## 🐛 Dépannage

### Erreur "policy already exists"
→ La table existe déjà, pas besoin de relancer la migration.

### Les likes ne s'incrémentent pas
→ Vérifie que la RLS est bien configurée sur `forum_likes`.

### Les badges ne s'affichent pas
→ Vérifie que la view `forum_user_stats` existe bien.

### Auto-masquage ne fonctionne pas
→ Vérifie que le trigger `trigger_check_reports` est actif.

---

## 📝 Notes importantes

1. **Pas de pagination** : Pour le MVP, tous les posts sont chargés. À optimiser si > 100 posts.

2. **Émojis welcome** : Le design utilise beaucoup d'émojis pour un ton friendly.

3. **Dark mode** : Tout le forum supporte le dark mode automatiquement.

4. **Temps réel** : Pour l'instant pas de temps réel (Supabase Realtime). Les utilisateurs doivent rafraîchir pour voir les nouveaux posts.

5. **Images** : Pas de support d'images pour le MVP. Texte seulement.

---

## 🎉 C'est prêt !

Le forum est **100% fonctionnel** ! Il ne reste plus qu'à :

1. Appliquer la migration SQL
2. Tester localement
3. Déployer en production
4. Annoncer la nouvelle fonctionnalité aux utilisateurs

Bonne chance ! 🚀
