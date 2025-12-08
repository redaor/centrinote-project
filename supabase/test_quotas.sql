-- ========================================
-- SCRIPTS DE TEST POUR LES QUOTAS
-- Utilisateur de test : redasahraoui1@gmail.com
-- ========================================

-- ========================================
-- 1. RÉINITIALISER LES QUOTAS (Remettre à zéro)
-- ========================================
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
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
)
AND period_start = date_trunc('month', now());

-- ========================================
-- 2. SIMULER PLAN FREE (Limites atteintes)
-- ========================================
-- Free : 20k tokens, 1 réunion, 1 résumé, 50 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 20000,  -- Quota épuisé
  meeting_count_used = 1,  -- Quota épuisé
  meeting_minutes_used = 45,
  summary_count_used = 1,  -- Quota épuisé
  vocab_words_count = 50,  -- Quota épuisé
  vocab_collections_count = 3,
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
)
AND period_start = date_trunc('month', now());

-- S'assurer que l'utilisateur a le plan Free
UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'free')
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);

-- ========================================
-- 3. SIMULER PLAN STARTER (Quotas partiels)
-- ========================================
-- Starter : 150k tokens, 10 réunions, 8 résumés, 100 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 100000,  -- 100k/150k (66%)
  meeting_count_used = 7,   -- 7/10 (70%)
  meeting_minutes_used = 315, -- 7 * 45 min
  summary_count_used = 5,   -- 5/8 (62%)
  vocab_words_count = 80,   -- 80/100 (80%)
  vocab_collections_count = 7,
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
)
AND period_start = date_trunc('month', now());

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'starter')
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);

-- ========================================
-- 4. SIMULER PLAN PRO (Quotas presque atteints)
-- ========================================
-- Pro : 600k tokens, 20 réunions, résumés illimités, 500 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 550000,  -- 550k/600k (91% - proche limite)
  meeting_count_used = 18,  -- 18/20 (90%)
  meeting_minutes_used = 1080, -- 18 * 60 min
  summary_count_used = 0,   -- Illimité, pas de limite
  vocab_words_count = 480,  -- 480/500 (96% - proche limite)
  vocab_collections_count = 45,
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
)
AND period_start = date_trunc('month', now());

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'pro')
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);

-- ========================================
-- 5. SIMULER PLAN TEAMS (Quotas illimités)
-- ========================================
-- Teams : tokens illimités, 60 réunions, résumés illimités, 1000 mots
UPDATE user_quotas
SET 
  ai_tokens_used = 1000000,  -- Utilisation élevée mais illimité
  meeting_count_used = 35,   -- 35/60 (58%)
  meeting_minutes_used = 2100, -- 35 * 60 min
  summary_count_used = 0,    -- Illimité
  vocab_words_count = 750,   -- 750/1000 (75%)
  vocab_collections_count = 0, -- Illimité
  updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
)
AND period_start = date_trunc('month', now());

UPDATE user_subscriptions
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'teams')
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'
);

-- ========================================
-- 6. VÉRIFIER L'ÉTAT ACTUEL DES QUOTAS
-- ========================================
SELECT 
  u.email,
  sp.name as plan_name,
  sp.display_name as plan_display,
  uq.ai_tokens_used,
  sp.ai_tokens_limit,
  ROUND((uq.ai_tokens_used::numeric / NULLIF(sp.ai_tokens_limit, 0)) * 100, 1) as tokens_percentage,
  uq.meeting_count_used,
  sp.meeting_count_limit,
  ROUND((uq.meeting_count_used::numeric / NULLIF(sp.meeting_count_limit, 0)) * 100, 1) as meetings_percentage,
  uq.summary_count_used,
  sp.summary_count_limit,
  CASE 
    WHEN sp.summary_count_limit IS NULL THEN 'Illimité'
    ELSE ROUND((uq.summary_count_used::numeric / NULLIF(sp.summary_count_limit, 0)) * 100, 1)::text || '%'
  END as summaries_percentage,
  uq.vocab_words_count,
  sp.vocab_words_limit,
  ROUND((uq.vocab_words_count::numeric / NULLIF(sp.vocab_words_limit, 0)) * 100, 1) as vocab_percentage
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN user_quotas uq ON uq.user_id = u.id AND uq.period_start = date_trunc('month', now())
WHERE u.email = 'redasahraoui1@gmail.com';

-- ========================================
-- 7. TESTER UNE VÉRIFICATION DE QUOTA
-- ========================================
-- Tester la fonction check_quota pour différents features
SELECT check_quota(
  (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
  'ai_tokens',
  1000
) as ai_tokens_check;

SELECT check_quota(
  (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
  'meeting_count',
  1
) as meeting_count_check;

SELECT check_quota(
  (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
  'summary_count',
  1
) as summary_count_check;

SELECT check_quota(
  (SELECT id FROM auth.users WHERE email = 'redasahraoui1@gmail.com'),
  'vocab_words',
  1
) as vocab_words_check;

-- ========================================
-- 8. CRÉER UN QUOTA SI IL N'EXISTE PAS
-- ========================================
INSERT INTO user_quotas (user_id, period_start, period_end)
SELECT 
  id,
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month'
FROM auth.users
WHERE email = 'redasahraoui1@gmail.com'
ON CONFLICT (user_id, period_start) DO NOTHING;

-- ========================================
-- 9. CRÉER UNE SUBSCRIPTION SI ELLE N'EXISTE PAS
-- ========================================
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
SELECT 
  u.id,
  sp.id,
  'active',
  now()
FROM auth.users u
CROSS JOIN subscription_plans sp
WHERE u.email = 'redasahraoui1@gmail.com'
  AND sp.name = 'free'
ON CONFLICT (user_id) DO UPDATE
SET plan_id = EXCLUDED.plan_id,
    status = 'active',
    updated_at = now();

