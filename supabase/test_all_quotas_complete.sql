-- ============================================================
-- 🧪 SCRIPTS SQL COMPLETS POUR TESTER TOUS LES QUOTAS
-- ============================================================
-- Email de test : redasahraoui1@gmail.com
-- Usage : Copier/coller chaque bloc dans Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 📋 FONCTION HELPER : Assigner un plan à l'utilisateur
-- ============================================================
CREATE OR REPLACE FUNCTION assign_plan_to_test_user(p_plan_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'redasahraoui1@gmail.com';
  SELECT id INTO v_plan_id FROM subscription_plans WHERE name = p_plan_name LIMIT 1;
  
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (v_user_id, v_plan_id, 'active')
  ON CONFLICT (user_id)
  DO UPDATE SET plan_id = v_plan_id, status = 'active', updated_at = now();
END $$;

-- ============================================================
-- 🆓 AI_TOKENS - TEST FREE : Limite atteinte (20 000/20 000)
-- ============================================================
-- Résultat attendu : {allowed: false, usage: 20000, limit: 20000, percentage: 100}

UPDATE user_quotas 
SET ai_tokens_used = 20000, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('free');

SELECT 
  '🆓 AI_TOKENS FREE (20k/20k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- ⭐ AI_TOKENS - TEST STARTER : 66% utilisé (100 000/150 000)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 100000, limit: 150000, percentage: 66.67}

UPDATE user_quotas 
SET ai_tokens_used = 100000, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('starter');

SELECT 
  '⭐ AI_TOKENS STARTER (100k/150k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- 💼 AI_TOKENS - TEST PRO : 90% utilisé (540 000/600 000)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 540000, limit: 600000, percentage: 90}

UPDATE user_quotas 
SET ai_tokens_used = 540000, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('pro');

SELECT 
  '💼 AI_TOKENS PRO (540k/600k)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_tokens',
    0
  ) as quota_check;

-- ============================================================
-- 🆓 MEETING_COUNT - TEST FREE : Limite atteinte (5/5)
-- ============================================================
-- Résultat attendu : {allowed: false, usage: 5, limit: 5, percentage: 100}

UPDATE user_quotas 
SET meeting_count_used = 5, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('free');

SELECT 
  '🆓 MEETING_COUNT FREE (5/5)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'meeting_count',
    0
  ) as quota_check;

-- ============================================================
-- ⭐ MEETING_COUNT - TEST STARTER : 66% utilisé (13/20)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 13, limit: 20, percentage: 65}

UPDATE user_quotas 
SET meeting_count_used = 13, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('starter');

SELECT 
  '⭐ MEETING_COUNT STARTER (13/20)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'meeting_count',
    0
  ) as quota_check;

-- ============================================================
-- 💼 MEETING_COUNT - TEST PRO : 90% utilisé (90/100)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 90, limit: 100, percentage: 90}

UPDATE user_quotas 
SET meeting_count_used = 90, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('pro');

SELECT 
  '💼 MEETING_COUNT PRO (90/100)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'meeting_count',
    0
  ) as quota_check;

-- ============================================================
-- 🆓 AI_HELP_COUNT - TEST FREE : Limite atteinte (3/3)
-- ============================================================
-- Résultat attendu : {allowed: false, usage: 3, limit: 3, percentage: 100}

UPDATE user_quotas 
SET ai_help_count = 3, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('free');

SELECT 
  '🆓 AI_HELP_COUNT FREE (3/3)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_help_count',
    0
  ) as quota_check;

-- ============================================================
-- ⭐ AI_HELP_COUNT - TEST STARTER : 66% utilisé (10/15)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 10, limit: 15, percentage: 66.67}

UPDATE user_quotas 
SET ai_help_count = 10, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('starter');

SELECT 
  '⭐ AI_HELP_COUNT STARTER (10/15)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_help_count',
    0
  ) as quota_check;

-- ============================================================
-- 💼 AI_HELP_COUNT - TEST PRO : 90% utilisé (45/50)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 45, limit: 50, percentage: 90}

UPDATE user_quotas 
SET ai_help_count = 45, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('pro');

SELECT 
  '💼 AI_HELP_COUNT PRO (45/50)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_help_count',
    0
  ) as quota_check;

-- ============================================================
-- 🆓 AUTOMATIONS_ACTIVE - TEST FREE : Limite atteinte (1/1)
-- ============================================================
-- Résultat attendu : {allowed: false, usage: 1, limit: 1, percentage: 100}

UPDATE user_quotas 
SET automations_active = 1, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('free');

SELECT 
  '🆓 AUTOMATIONS_ACTIVE FREE (1/1)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'automations_active',
    0
  ) as quota_check;

-- ============================================================
-- ⭐ AUTOMATIONS_ACTIVE - TEST STARTER : 60% utilisé (3/5)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 3, limit: 5, percentage: 60}

UPDATE user_quotas 
SET automations_active = 3, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('starter');

SELECT 
  '⭐ AUTOMATIONS_ACTIVE STARTER (3/5)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'automations_active',
    0
  ) as quota_check;

-- ============================================================
-- 💼 AUTOMATIONS_ACTIVE - TEST PRO : 90% utilisé (18/20)
-- ============================================================
-- Résultat attendu : {allowed: true, usage: 18, limit: 20, percentage: 90}

UPDATE user_quotas 
SET automations_active = 18, updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('pro');

SELECT 
  '💼 AUTOMATIONS_ACTIVE PRO (18/20)' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'automations_active',
    0
  ) as quota_check;

-- ============================================================
-- 🔄 RESET GLOBAL : Remet tous les compteurs à 0
-- ============================================================

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
  ai_help_count = 0,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now');

-- Vérification après reset
SELECT 
  '🔄 RESET GLOBAL COMPLET' as test_name,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_tokens',
    0
  ) as ai_tokens_check,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'meeting_count',
    0
  ) as meeting_count_check,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'ai_help_count',
    0
  ) as ai_help_check,
  check_quota(
    (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
    'automations_active',
    0
  ) as automations_check;

-- ============================================================
-- 📊 VUE D'ENSEMBLE : État actuel de TOUS les quotas
-- ============================================================

SELECT 
  u.email,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  
  -- AI Tokens
  sp.ai_tokens_limit,
  uq.ai_tokens_used,
  CASE 
    WHEN sp.ai_tokens_limit IS NULL THEN 0
    WHEN sp.ai_tokens_limit = 0 THEN 100
    ELSE ROUND((uq.ai_tokens_used::NUMERIC / sp.ai_tokens_limit::NUMERIC) * 100, 2)
  END as ai_tokens_percentage,
  
  -- Meeting Count
  sp.meeting_count_limit,
  uq.meeting_count_used,
  CASE 
    WHEN sp.meeting_count_limit IS NULL THEN 0
    WHEN sp.meeting_count_limit = 0 THEN 100
    ELSE ROUND((uq.meeting_count_used::NUMERIC / sp.meeting_count_limit::NUMERIC) * 100, 2)
  END as meeting_count_percentage,
  
  -- AI Help Count
  sp.ai_help_count_limit,
  COALESCE(uq.ai_help_count, 0) as ai_help_count,
  CASE 
    WHEN sp.ai_help_count_limit IS NULL THEN 0
    WHEN sp.ai_help_count_limit = 0 THEN 100
    ELSE ROUND((COALESCE(uq.ai_help_count, 0)::NUMERIC / sp.ai_help_count_limit::NUMERIC) * 100, 2)
  END as ai_help_percentage,
  
  -- Automations Active
  sp.automations_active_limit,
  uq.automations_active,
  CASE 
    WHEN sp.automations_active_limit IS NULL THEN 0
    WHEN sp.automations_active_limit = 0 THEN 100
    ELSE ROUND((uq.automations_active::NUMERIC / sp.automations_active_limit::NUMERIC) * 100, 2)
  END as automations_percentage,
  
  uq.period_start,
  uq.updated_at
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN user_quotas uq ON uq.user_id = u.id 
  AND uq.period_start = date_trunc('month', now())
WHERE u.email = 'redasahraoui1@gmail.com';

-- ============================================================
-- 🧪 SCRIPTS DE TEST PAR SCÉNARIO COMPLET
-- ============================================================
-- Ces scripts testent TOUS les quotas d'un plan en une fois
-- ============================================================

-- ============================================================
-- 🆓 SCÉNARIO COMPLET FREE : Tous les quotas à 100%
-- ============================================================

UPDATE user_quotas 
SET 
  ai_tokens_used = 20000,
  meeting_count_used = 5,
  ai_help_count = 3,
  automations_active = 1,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('free');

SELECT 
  '🆓 SCÉNARIO FREE COMPLET' as scenario,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_tokens', 0) as ai_tokens,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'meeting_count', 0) as meeting_count,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_help_count', 0) as ai_help,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'automations_active', 0) as automations;

-- ============================================================
-- ⭐ SCÉNARIO COMPLET STARTER : Tous les quotas à 66%
-- ============================================================

UPDATE user_quotas 
SET 
  ai_tokens_used = 100000,
  meeting_count_used = 13,
  ai_help_count = 10,
  automations_active = 3,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('starter');

SELECT 
  '⭐ SCÉNARIO STARTER COMPLET' as scenario,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_tokens', 0) as ai_tokens,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'meeting_count', 0) as meeting_count,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_help_count', 0) as ai_help,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'automations_active', 0) as automations;

-- ============================================================
-- 💼 SCÉNARIO COMPLET PRO : Tous les quotas à 90%
-- ============================================================

UPDATE user_quotas 
SET 
  ai_tokens_used = 540000,
  meeting_count_used = 90,
  ai_help_count = 45,
  automations_active = 18,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com')
  AND period_start = date_trunc('month', now());

SELECT assign_plan_to_test_user('pro');

SELECT 
  '💼 SCÉNARIO PRO COMPLET' as scenario,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_tokens', 0) as ai_tokens,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'meeting_count', 0) as meeting_count,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'ai_help_count', 0) as ai_help,
  check_quota((SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'), 'automations_active', 0) as automations;

-- ============================================================
-- ✅ FIN DES SCRIPTS DE TEST
-- ============================================================
-- Résumé :
-- - 12 scripts individuels (3 plans × 4 types de quotas)
-- - 3 scripts scénarios complets (tous quotas d'un plan)
-- - 1 script reset global
-- - 1 vue d'ensemble
-- Total : 17 scripts prêts à utiliser
-- ============================================================

