-- ============================================================
-- 🧪 SCRIPTS SQL POUR TESTER LES QUOTAS DES 3 FORFAITS
-- ============================================================
-- Usage : Copier/coller dans QuotaTester ou exécuter directement
-- Email de test : redasahraoui1@gmail.com
-- ============================================================

-- ============================================================
-- 📋 VARIABLE : Email de l'utilisateur de test
-- ============================================================
-- Modifier cette valeur si vous testez avec un autre email
\set test_email 'redasahraoui1@gmail.com'

-- ============================================================
-- 🆓 TEST FREE : Limite atteinte (20 000/20 000 = 100%)
-- ============================================================
-- Objectif : Vérifier que le quota Free bloque à 100%
-- Résultat attendu : {allowed: false, usage: 20000, limit: 20000, percentage: 100}

-- 1. S'assurer que le quota existe pour le mois en cours
INSERT INTO user_quotas (user_id, period_start, period_end, ai_tokens_used)
SELECT 
  u.id,
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month',
  20000
FROM auth.users u
WHERE u.email = :'test_email'
ON CONFLICT (user_id, period_start) 
DO UPDATE SET 
  ai_tokens_used = 20000,
  updated_at = now();

-- 2. S'assurer que l'utilisateur a le plan Free
DO $$
DECLARE
  v_user_id UUID;
  v_free_plan_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = :'test_email';
  
  -- Récupérer l'ID du plan Free
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;
  
  -- Créer ou mettre à jour l'abonnement Free
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_free_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan_id = v_free_plan_id,
    status = 'active',
    updated_at = now();
END $$;

-- 3. Vérifier le résultat avec check_quota()
SELECT 
  '🆓 TEST FREE (20k/20k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- ⭐ TEST STARTER : 66% utilisé (100 000/150 000 = 66.67%)
-- ============================================================
-- Objectif : Vérifier que le quota Starter autorise à 66%
-- Résultat attendu : {allowed: true, usage: 100000, limit: 150000, percentage: 66.67}

-- 1. Positionner le quota à 100 000 tokens
UPDATE user_quotas 
SET 
  ai_tokens_used = 100000,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = :'test_email')
  AND period_start = date_trunc('month', now());

-- 2. S'assurer que l'utilisateur a le plan Starter
DO $$
DECLARE
  v_user_id UUID;
  v_starter_plan_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = :'test_email';
  
  SELECT id INTO v_starter_plan_id
  FROM subscription_plans
  WHERE name = 'starter'
  LIMIT 1;
  
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_starter_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan_id = v_starter_plan_id,
    status = 'active',
    updated_at = now();
END $$;

-- 3. Vérifier le résultat
SELECT 
  '⭐ TEST STARTER (100k/150k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- 💼 TEST PRO : 90% utilisé (540 000/600 000 = 90%)
-- ============================================================
-- Objectif : Vérifier que le quota Pro autorise à 90% (alerte)
-- Résultat attendu : {allowed: true, usage: 540000, limit: 600000, percentage: 90}

-- 1. Positionner le quota à 540 000 tokens
UPDATE user_quotas 
SET 
  ai_tokens_used = 540000,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = :'test_email')
  AND period_start = date_trunc('month', now());

-- 2. S'assurer que l'utilisateur a le plan Pro
DO $$
DECLARE
  v_user_id UUID;
  v_pro_plan_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = :'test_email';
  
  SELECT id INTO v_pro_plan_id
  FROM subscription_plans
  WHERE name = 'pro'
  LIMIT 1;
  
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_pro_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan_id = v_pro_plan_id,
    status = 'active',
    updated_at = now();
END $$;

-- 3. Vérifier le résultat
SELECT 
  '💼 TEST PRO (540k/600k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- 🔄 RESET POUR RE-TEST
-- ============================================================
-- Remet tous les compteurs à 0 pour recommencer les tests

UPDATE user_quotas 
SET 
  ai_tokens_used = 0,
  meeting_count_used = 0,
  meeting_minutes_used = 0,
  summary_count_used = 0,
  vocab_words_count = 0,
  vocab_collections_count = 0,
  notifications_sent = 0,
  automations_active = 0,
  automations_executions = 0,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = :'test_email')
  AND period_start = date_trunc('month', now');

-- Vérification après reset
SELECT 
  '🔄 RESET COMPLET' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- ⚠️ BONUS : TEST DÉPASSEMENT FREE (25 000/20 000)
-- ============================================================
-- Objectif : Vérifier que le système bloque en cas de dépassement
-- Résultat attendu : {allowed: false, usage: 25000, limit: 20000, percentage: 125}

-- 1. Positionner le quota à 25 000 tokens (dépassement)
UPDATE user_quotas 
SET 
  ai_tokens_used = 25000,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = :'test_email')
  AND period_start = date_trunc('month', now());

-- 2. S'assurer que l'utilisateur a le plan Free
DO $$
DECLARE
  v_user_id UUID;
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = :'test_email';
  
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free'
  LIMIT 1;
  
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_free_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan_id = v_free_plan_id,
    status = 'active',
    updated_at = now();
END $$;

-- 3. Vérifier que check_quota bloque même avec increment = 0
SELECT 
  '⚠️ DÉPASSEMENT FREE (25k/20k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- 4. Vérifier que check_quota bloque avec un nouvel increment
SELECT 
  '⚠️ DÉPASSEMENT FREE + 1000 tokens' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    1000
  ) as quota_check;

-- ============================================================
-- ⚠️ BONUS : TEST DÉPASSEMENT STARTER (160 000/150 000)
-- ============================================================
-- Objectif : Vérifier que le système bloque en cas de dépassement Starter
-- Résultat attendu : {allowed: false, usage: 160000, limit: 150000, percentage: 106.67}

-- 1. Positionner le quota à 160 000 tokens (dépassement)
UPDATE user_quotas 
SET 
  ai_tokens_used = 160000,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = :'test_email')
  AND period_start = date_trunc('month', now());

-- 2. S'assurer que l'utilisateur a le plan Starter
DO $$
DECLARE
  v_user_id UUID;
  v_starter_plan_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = :'test_email';
  
  SELECT id INTO v_starter_plan_id
  FROM subscription_plans
  WHERE name = 'starter'
  LIMIT 1;
  
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_starter_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    plan_id = v_starter_plan_id,
    status = 'active',
    updated_at = now();
END $$;

-- 3. Vérifier que check_quota bloque
SELECT 
  '⚠️ DÉPASSEMENT STARTER (160k/150k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = :'test_email'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- 📊 VUE D'ENSEMBLE : État actuel des quotas
-- ============================================================
-- Affiche l'état complet des quotas pour l'utilisateur de test

SELECT 
  u.email,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  sp.ai_tokens_limit,
  uq.ai_tokens_used,
  CASE 
    WHEN sp.ai_tokens_limit IS NULL THEN 0
    WHEN sp.ai_tokens_limit = 0 THEN 100
    ELSE ROUND((uq.ai_tokens_used::NUMERIC / sp.ai_tokens_limit::NUMERIC) * 100, 2)
  END as percentage_used,
  CASE 
    WHEN sp.ai_tokens_limit IS NULL THEN true
    WHEN uq.ai_tokens_used >= sp.ai_tokens_limit THEN false
    ELSE true
  END as allowed,
  uq.period_start,
  uq.updated_at
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN user_quotas uq ON uq.user_id = u.id 
  AND uq.period_start = date_trunc('month', now())
WHERE u.email = :'test_email';

-- ============================================================
-- ✅ FIN DES SCRIPTS DE TEST
-- ============================================================
-- Pour utiliser ces scripts :
-- 1. Copier le bloc de test souhaité
-- 2. Exécuter dans Supabase SQL Editor ou via QuotaTester
-- 3. Vérifier les résultats avec les SELECT check_quota()
-- ============================================================

