# ✅ Checklist de Déploiement - Système Stripe Stylisé

**Date:** 2024-11-30  
**Commit:** `0d514a1` - Système de stylisation Stripe complet

---

## ✅ Étape 1: Code déployé

- ✅ Code commité sur GitHub
- ✅ Push effectué sur `main`
- ⏳ Netlify déploie automatiquement (vérifier le dashboard)

---

## 🔴 Étape 2: Migration SQL (OBLIGATOIRE)

**Fichier:** `supabase/migrations/20241130_launch_final.sql`

### Via Supabase Dashboard:
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. SQL Editor → New Query
4. Copier-coller le contenu de `supabase/migrations/20241130_launch_final.sql`
5. Exécuter

### Via Supabase CLI:
```bash
supabase migration up
```

**⚠️ IMPORTANT:** Cette migration :
- Ajoute la colonne `meeting_max_participants`
- Migre `profiles.subscription` → `user_subscriptions`
- Initialise les quotas pour utilisateurs existants
- Crée la table `stripe_price_mapping`

---

## 🔴 Étape 3: Compléter stripe_price_mapping (OBLIGATOIRE)

Après la migration, ajouter vos vrais Price IDs :

```sql
-- Remplacer par vos vrais price IDs depuis Stripe Dashboard
INSERT INTO stripe_price_mapping (price_id, plan_name) VALUES
  ('price_xxx_STARTER_NORMAL', 'starter'),
  ('price_xxx_STARTER_PROMO', 'starter'),
  ('price_xxx_PRO_NORMAL', 'pro'),
  ('price_xxx_PRO_PROMO', 'pro'),
  ('price_xxx_TEAMS_NORMAL', 'teams'),
  ('price_xxx_TEAMS_PROMO', 'teams')
ON CONFLICT (price_id) DO UPDATE SET plan_name = EXCLUDED.plan_name;
```

**Pour trouver vos Price IDs:**
1. Stripe Dashboard → Products
2. Cliquer sur chaque produit
3. Section "Pricing" → Copier les Price IDs (commencent par `price_`)

---

## 🔴 Étape 4: Redéployer Edge Functions (OBLIGATOIRE)

Les Edge Functions ont été modifiées, il faut les redéployer :

```bash
# Redéployer stripe-checkout
supabase functions deploy stripe-checkout

# Redéployer stripe-webhook
supabase functions deploy stripe-webhook
```

**⚠️ IMPORTANT:** Vérifier que les variables d'environnement sont bien configurées dans Supabase :
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_PRICE_ID_starter_normal`
- `VITE_PRICE_ID_starter_promo`
- `VITE_PRICE_ID_PRO_normal`
- `VITE_PRICE_ID_pro_promo`
- `VITE_PRICE_ID_teams_normal`
- `VITE_PRICE_ID_teams_promo`

---

## ✅ Étape 5: Vérifier variables Netlify

Dans Netlify Dashboard → Site settings → Environment variables, vérifier :

```env
VITE_PRICE_ID_starter_normal=price_xxx
VITE_PRICE_ID_starter_promo=price_xxx
VITE_PRICE_ID_PRO_normal=price_xxx
VITE_PRICE_ID_pro_promo=price_xxx
VITE_PRICE_ID_teams_normal=price_xxx
VITE_PRICE_ID_teams_promo=price_xxx
```

---

## 🧪 Étape 6: Tests

### Test 1: Landing page
1. Aller sur https://centrinote.fr/launch
2. Vérifier que les prix s'affichent correctement
3. Cliquer sur "Choisir Starter"
4. Vérifier la redirection vers `/register?plan=starter`

### Test 2: Checkout automatique
1. Se connecter
2. Aller sur `/register?plan=starter`
3. Vérifier que le checkout Stripe se lance automatiquement
4. Vérifier que le bon price_id (promo si active) est utilisé

### Test 3: Webhook
1. Compléter un paiement test dans Stripe
2. Vérifier les logs du webhook
3. Vérifier que `user_subscriptions` est créé/mis à jour
4. Vérifier que le plan est activé

---

## 📊 Statut

| Étape | Statut | Action |
|-------|--------|--------|
| Code déployé | ✅ | Netlify déploie automatiquement |
| Migration SQL | ⏳ | À exécuter |
| stripe_price_mapping | ⏳ | À compléter |
| Edge Functions | ⏳ | À redéployer |
| Variables Netlify | ✅ | Vérifier |
| Tests | ⏳ | À faire |

---

## 🎯 Résultat attendu

Après toutes ces étapes :
- ✅ Les liens `/register?plan=starter` fonctionnent
- ✅ Le checkout utilise automatiquement le prix promo si actif
- ✅ Le webhook active automatiquement le plan après paiement
- ✅ Aucun ID brut dans le code, tout stylisé

