# 🧪 Guide de Test des Quotas

Ce guide explique comment tester les limites de quotas pour chaque plan d'abonnement.

## 📋 Vue d'ensemble

Le système de test permet de simuler différents états de quota pour tester le comportement de l'application selon le plan utilisateur.

## 🚀 Méthode 1 : Interface Graphique (Recommandé)

### Accès
1. Connectez-vous avec votre compte (`redasahraoui1@gmail.com` ou `reda_sahraoui@outlook.fr`)
2. Allez dans **Paramètres** (Settings)
3. Faites défiler jusqu'à la section **🧪 Testeur de Quotas**

### Utilisation
- Cliquez sur un scénario pour l'appliquer :
  - **🔄 Réinitialiser** : Remet tous les quotas à zéro
  - **🆓 Free** : Simule un utilisateur Free avec toutes les limites atteintes
  - **⭐ Starter** : Simule un utilisateur Starter avec 66% des quotas utilisés
  - **💼 Pro** : Simule un utilisateur Pro avec 90% des quotas utilisés
  - **👥 Teams** : Simule un utilisateur Teams avec quotas élevés mais illimités

- Cliquez sur **Actualiser** pour voir l'état actuel des quotas

## 🗄️ Méthode 2 : Scripts SQL Directs

### Exécution dans Supabase

1. Ouvrez le **Supabase Dashboard**
2. Allez dans **SQL Editor**
3. Copiez-collez le script souhaité depuis `supabase/test_quotas.sql`
4. Exécutez le script

### Scripts disponibles

#### 1. Réinitialiser les quotas
```sql
-- Remet tous les quotas à zéro
UPDATE user_quotas
SET 
  ai_tokens_used = 0,
  meeting_count_used = 0,
  meeting_minutes_used = 0,
  summary_count_used = 0,
  vocab_words_count = 0,
  -- ...
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

#### 2. Simuler Plan Free (Limites atteintes)
```sql
-- Free : 20k tokens, 1 réunion, 1 résumé, 50 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 20000,  -- Quota épuisé
  meeting_count_used = 1,  -- Quota épuisé
  summary_count_used = 1,  -- Quota épuisé
  vocab_words_count = 50,  -- Quota épuisé
  -- ...
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

#### 3. Simuler Plan Starter (66% utilisé)
```sql
-- Starter : 150k tokens, 10 réunions, 8 résumés, 100 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 100000,  -- 100k/150k (66%)
  meeting_count_used = 7,   -- 7/10 (70%)
  summary_count_used = 5,   -- 5/8 (62%)
  vocab_words_count = 80,   -- 80/100 (80%)
  -- ...
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

#### 4. Simuler Plan Pro (90% utilisé)
```sql
-- Pro : 600k tokens, 20 réunions, résumés illimités, 500 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 550000,  -- 550k/600k (91%)
  meeting_count_used = 18,  -- 18/20 (90%)
  vocab_words_count = 480,  -- 480/500 (96%)
  -- ...
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

#### 5. Simuler Plan Teams (Illimité)
```sql
-- Teams : tokens illimités, 60 réunions, résumés illimités, 1000 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 1000000,  -- Utilisation élevée mais illimité
  meeting_count_used = 35,   -- 35/60 (58%)
  vocab_words_count = 750,   -- 750/1000 (75%)
  -- ...
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

### Changer de plan
```sql
-- Changer le plan de l'utilisateur
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free')
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);
```

Remplacez `'free'` par `'starter'`, `'pro'` ou `'teams'`.

## 🔍 Vérifier l'état actuel

### Requête SQL pour voir tous les quotas
```sql
SELECT 
  u.email,
  sp.name as plan_name,
  sp.display_name as plan_display,
  uq.ai_tokens_used,
  sp.ai_tokens_limit,
  ROUND((uq.ai_tokens_used::numeric / NULLIF(sp.ai_tokens_limit, 0)) * 100, 1) as tokens_percentage,
  uq.meeting_count_used,
  sp.meeting_count_limit,
  uq.summary_count_used,
  sp.summary_count_limit,
  uq.vocab_words_count,
  sp.vocab_words_limit
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN user_quotas uq ON uq.user_id = u.id AND uq.period_start = date_trunc('month', now())
WHERE u.email = 'redasahraoui1@gmail.com';
```

## 🧪 Tests à effectuer

### Test 1 : Limite de participants
1. Appliquez le scénario **Free**
2. Créez une réunion
3. Essayez d'ajouter plus de 3 participants
4. **Résultat attendu** : Message d'erreur, limite à 3 participants

### Test 2 : Limite de réunions
1. Appliquez le scénario **Free** (1 réunion déjà utilisée)
2. Essayez de créer une nouvelle réunion
3. **Résultat attendu** : Message d'erreur "Quota de réunions épuisé"

### Test 3 : Limite de résumés IA
1. Appliquez le scénario **Free** (1 résumé déjà utilisé)
2. Créez une réunion avec "Générer résumé automatique" activé
3. **Résultat attendu** : Toggle désactivé ou message d'erreur

### Test 4 : Limite de vocabulaire
1. Appliquez le scénario **Free** (50 mots déjà utilisés)
2. Essayez d'ajouter un nouveau mot
3. **Résultat attendu** : Message d'erreur "Limite de vocabulaire atteinte"

### Test 5 : Plan Pro avec résumés illimités
1. Appliquez le scénario **Pro**
2. Créez plusieurs réunions avec résumés
3. **Résultat attendu** : Pas de limite, tous les résumés fonctionnent

## 📊 Scénarios de test détaillés

| Scénario | Plan | Tokens | Réunions | Résumés | Vocabulaire | État |
|----------|------|--------|----------|---------|-------------|------|
| Reset | Free | 0/20k | 0/1 | 0/1 | 0/50 | ✅ Disponible |
| Free | Free | 20k/20k | 1/1 | 1/1 | 50/50 | ❌ Tous épuisés |
| Starter | Starter | 100k/150k | 7/10 | 5/8 | 80/100 | ⚠️ Partiel |
| Pro | Pro | 550k/600k | 18/20 | ∞ | 480/500 | ⚠️ Proche limite |
| Teams | Teams | ∞ | 35/60 | ∞ | 750/1000 | ✅ Disponible |

## 🔧 Dépannage

### Le testeur ne s'affiche pas
- Vérifiez que vous êtes connecté avec `redasahraoui1@gmail.com` ou `reda_sahraoui@outlook.fr`
- Vérifiez que vous êtes dans la page **Paramètres**

### Les quotas ne se mettent pas à jour
- Vérifiez que la fonction Netlify `test-quotas` est déployée
- Vérifiez les logs Netlify pour les erreurs
- Utilisez les scripts SQL directement dans Supabase

### Erreur "Utilisateur non trouvé"
- Vérifiez que l'email existe dans `auth.users`
- Vérifiez que l'utilisateur a un quota créé pour le mois en cours

## 📝 Notes importantes

1. **Les quotas sont mensuels** : Ils se réinitialisent automatiquement le 1er de chaque mois
2. **Les modifications sont persistantes** : Utilisez "Réinitialiser" pour remettre à zéro
3. **Testez chaque plan** : Vérifiez que les limites sont correctement appliquées
4. **Vérifiez les messages d'erreur** : Ils doivent être clairs et proposer un upgrade

## 🎯 Prochaines étapes

Après avoir testé les quotas :
1. Vérifiez que les messages d'upgrade s'affichent correctement
2. Testez le flux d'upgrade vers un plan supérieur
3. Vérifiez que les limites sont respectées dans tous les composants
4. Testez les cas limites (quota à 99%, 100%, etc.)

---

*Dernière mise à jour : 2025-01-XX*

