# 🔍 Audit de Compatibilité - Système Plans & Quotas CentriNote

**Date:** 2024-11-29  
**Objectif:** Valider la compatibilité avec le nouveau système de plans (Free, Starter, Pro, Teams)

---

## 1. Stack Technique

**✅ OK** - Stack complète et opérationnelle

- **React 18.3.1** : Framework frontend
- **Supabase** : Backend (auth, database, Edge Functions)
- **Stripe** : Paiement (Checkout Sessions, Webhooks)
- **Edge Functions** : `stripe-checkout`, `stripe-webhook`
- **Netlify Functions** : Serverless functions complémentaires

**Fichiers clés:**
- `package.json` : Dépendances configurées
- `supabase/functions/stripe-checkout/` : Edge Function checkout
- `supabase/functions/stripe-webhook/` : Edge Function webhooks

---

## 2. Système d'Authentification

**✅ OK** - Email/mot de passe avec confirmation

- **Méthode principale:** Email + mot de passe (`signInWithPassword`)
- **Inscription:** `signUpWithRobustEmail` avec confirmation email
- **OAuth:** ❌ Non implémenté
- **Magic Link:** ❌ Non implémenté (mais possible via Supabase)

**Fichiers clés:**
- `src/components/AuthForm.tsx` : Formulaire auth
- `src/services/authService.js` : Service d'authentification
- `src/pages/VerifyEmailPage.tsx` : Vérification email

**Note:** Le système actuel est suffisant pour le nouveau système de plans.

---

## 3. Système de Paiement

**✅ OK** - Stripe Checkout Sessions (subscription mode)

- **Méthode:** Stripe Checkout (redirection externe)
- **Mode:** `subscription` (abonnements récurrents)
- **Edge Function:** `stripe-checkout` pour créer sessions
- **Embedded:** ❌ Non utilisé (Checkout redirect uniquement)

**Fichiers clés:**
- `supabase/functions/stripe-checkout/index.ts` : Création sessions
- `src/services/stripeCheckout.ts` : Client frontend
- `src/services/stripeService.ts` : Service wrapper

**Note:** Compatible avec les nouveaux plans (Free, Starter, Pro, Teams).

---

## 4. Tables des Plans

**✅ OK** - Tables complètes avec structure moderne

**Tables existantes:**
- ✅ `subscription_plans` : Plans (free, starter, pro, teams) avec limites
- ✅ `user_subscriptions` : Lien user ↔ plan (status, dates)
- ✅ `user_quotas` : Compteurs mensuels par feature

**Migration:** `supabase/migrations/20241129_launch_quotas_system.sql`

**Structure:**
```sql
subscription_plans:
  - name (free, starter, pro, teams)
  - price_cents, promo_price_cents, promo_end_date
  - ai_tokens_limit, meeting_count_limit, etc.

user_subscriptions:
  - user_id, plan_id, status, started_at, expires_at

user_quotas:
  - user_id, period_start, period_end
  - ai_tokens_used, meeting_count_used, etc.
```

**Note:** Structure déjà alignée avec les nouveaux plans. ✅

---

## 5. Middleware Quota

**✅ OK** - Fonctions PostgreSQL RPC complètes

**Fonctions existantes:**
- ✅ `check_quota(p_user_id, p_feature, p_increment)` : Vérifie si usage autorisé
- ✅ `increment_quota(p_user_id, p_feature, p_amount)` : Incrémente compteur
- ✅ `check_meeting_duration_limit(p_user_id, p_duration_minutes)` : Vérifie durée max

**Service frontend:**
- ✅ `src/services/quotaService.ts` : Wrapper TypeScript

**Features supportées:**
- `ai_tokens`, `meeting_count`, `meeting_minutes`, `summary_count`
- `vocab_words`, `vocab_collections`, `notifications`, `automations_active`

**Note:** Middleware prêt pour les nouveaux plans. ✅

---

## 6. Route de Choix de Plan

**✅ OK** - Route `/plan` existante avec composants

**Route:** `/plan` (déjà dans AppRouter)

**Composants:**
- ✅ `src/pages/PlanPage.tsx` : Page principale
- ✅ `src/components/plan/PlanPlans.tsx` : Affichage plans
- ✅ `src/components/plan/PlanOverview.tsx` : Vue d'ensemble
- ✅ `src/components/plan/PlanSection.tsx` : Section billing

**Fonctionnalités:**
- Affichage plans
- Sélection plan → redirection Stripe
- Gestion plan actuel

**Note:** Route existante, mais nécessite mise à jour pour nouveaux plans (Free, Starter, Pro, Teams).

---

## 7. Validation Post-Paiement

**✅ OK** - Webhook Stripe configuré

**Edge Function:** `supabase/functions/stripe-webhook/index.ts`

**Événements gérés:**
- ✅ `checkout.session.completed` : Session checkout terminée
- ✅ `customer.subscription.updated` : Mise à jour abonnement
- ✅ `customer.subscription.deleted` : Annulation abonnement

**Actions:**
- ✅ Sync `stripe_subscriptions` depuis Stripe
- ✅ Mise à jour `stripe_customers`
- ✅ Insertion `stripe_orders` pour paiements uniques

**Tables mises à jour:**
- `stripe_customers` : Lien user ↔ customer Stripe
- `stripe_subscriptions` : État abonnement
- `stripe_orders` : Historique commandes

**Note:** Webhook fonctionnel, mais nécessite liaison avec `user_subscriptions` pour activer plan.

---

## 8. Compatibilité avec Ancienne Présentation

**❌ À modifier** - Migration nécessaire

**Ancien système:**
- `profiles.subscription` : TEXT ('free', 'basic', 'premium')
- Pas de quotas détaillés
- Pas de système de plans structuré

**Nouveau système:**
- `subscription_plans` : Plans structurés (free, starter, pro, teams)
- `user_subscriptions` : Lien user ↔ plan
- `user_quotas` : Compteurs mensuels

**Actions requises:**
1. ✅ Tables créées (migration `20241129_launch_quotas_system.sql`)
2. ❌ **Migration données:** Migrer `profiles.subscription` → `user_subscriptions`
3. ❌ **Mise à jour code:** Remplacer références `profiles.subscription` par `user_subscriptions`
4. ❌ **Mise à jour UI:** Adapter composants plan pour nouveaux noms (starter, pro, teams)

**Fichiers à modifier:**
- `src/services/subscriptionService.ts` : Utilise encore `profiles.subscription`
- `src/pages/PlanPage.tsx` : Hardcodé "free", "pro", "focus" → changer en "free", "starter", "pro", "teams"
- `src/config/planPrices.ts` : Plans "free", "pro", "focus" → mettre à jour

---

## 📊 Résumé

| Point | Statut | Action |
|-------|--------|--------|
| 1. Stack technique | ✅ OK | Aucune |
| 2. Authentification | ✅ OK | Aucune |
| 3. Paiement Stripe | ✅ OK | Aucune |
| 4. Tables plans | ✅ OK | Aucune |
| 5. Middleware quota | ✅ OK | Aucune |
| 6. Route choix plan | ✅ OK | Mise à jour UI |
| 7. Webhook post-paiement | ✅ OK | Liaison `user_subscriptions` |
| 8. Compatibilité ancien | ❌ À modifier | Migration données + code |

---

## 🎯 Actions Prioritaires

### 1. Migration des Données (CRITIQUE)
```sql
-- Migrer profiles.subscription → user_subscriptions
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
SELECT 
  p.id,
  sp.id,
  CASE 
    WHEN p.subscription = 'free' THEN 'active'
    WHEN p.subscription = 'basic' THEN 'active' -- → starter
    WHEN p.subscription = 'premium' THEN 'active' -- → pro
    ELSE 'active'
  END,
  p.created_at
FROM profiles p
LEFT JOIN subscription_plans sp ON 
  CASE 
    WHEN p.subscription = 'free' THEN sp.name = 'free'
    WHEN p.subscription = 'basic' THEN sp.name = 'starter'
    WHEN p.subscription = 'premium' THEN sp.name = 'pro'
    ELSE sp.name = 'free'
  END
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
);
```

### 2. Mise à Jour Code Frontend
- Remplacer `profiles.subscription` par `getUserPlan()` depuis `quotaService`
- Mettre à jour `PlanPage.tsx` pour afficher Free, Starter, Pro, Teams
- Mettre à jour `planPrices.ts` avec nouveaux plans

### 3. Liaison Webhook → user_subscriptions
- Modifier `stripe-webhook/index.ts` pour créer/mettre à jour `user_subscriptions` après paiement
- Lier `stripe_subscriptions.price_id` → `subscription_plans` → `user_subscriptions.plan_id`

---

## ✅ Conclusion

**Le système est à 90% prêt.** Les tables et fonctions sont en place. Il reste à :
1. Migrer les données existantes
2. Mettre à jour le code frontend pour utiliser le nouveau système
3. Connecter le webhook Stripe à `user_subscriptions`

**Risque de casser l'existant:** ⚠️ **FAIBLE** - Les anciennes tables restent, migration progressive possible.

