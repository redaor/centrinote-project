-- ========================================
-- SCRIPT DE DEBUG QUOTAS
-- ========================================
-- Utilise ce script pour tester l'état des quotas dans Supabase
--
-- INSTRUCTIONS:
-- 1. Remplace 'USER_ID_ICI' par l'ID réel de ton utilisateur
-- 2. Exécute chaque section dans Supabase SQL Editor
-- 3. Copie les résultats pour l'analyse
-- ========================================

-- ========================================
-- SECTION 1: INFORMATIONS UTILISATEUR
-- ========================================
-- Récupère les infos de base de l'utilisateur et son plan

SELECT
  u.id as user_id,
  u.email,
  u.role,
  us.status as subscription_status,
  sp.name as plan_name,
  sp.display_name as plan_display_name
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE u.id = 'USER_ID_ICI';

-- ========================================
-- SECTION 2: ÉTAT DES QUOTAS ACTUELS
-- ========================================
-- Vérifie tous les quotas de l'utilisateur pour le mois en cours

SELECT
  uq.user_id,
  uq.feature,
  uq.usage_count,
  uq.usage_month,
  pl.ai_help_count as plan_limit,
  CASE
    WHEN pl.ai_help_count IS NULL THEN 0
    WHEN pl.ai_help_count = -1 THEN 0
    ELSE ROUND((uq.usage_count::numeric / pl.ai_help_count::numeric) * 100, 2)
  END as percentage
FROM user_quotas uq
LEFT JOIN user_subscriptions us ON us.user_id = uq.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN plan_limits pl ON pl.plan_id = sp.id
WHERE uq.user_id = 'USER_ID_ICI'
  AND uq.feature = 'ai_help_count'
  AND uq.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
ORDER BY uq.feature;

-- ========================================
-- SECTION 3: TEST CHECK_QUOTA (SANS INCRÉMENT)
-- ========================================
-- Simule ce que fait le useEffect au chargement (increment = 0)
-- Ce test NE modifie PAS les quotas

SELECT check_quota('USER_ID_ICI', 'ai_help_count', 0);

-- ========================================
-- SECTION 4: TEST CHECK_QUOTA (AVEC INCRÉMENT)
-- ========================================
-- Simule ce que fait checkQuotaWithModal lors de l'utilisation (increment = 1)
-- ⚠️ ATTENTION: Ce test INCRÉMENTE le quota de 1

SELECT check_quota('USER_ID_ICI', 'ai_help_count', 1);

-- ========================================
-- SECTION 5: VÉRIFIER LE PLAN ET SES LIMITES
-- ========================================
-- Affiche les limites configurées pour le plan de l'utilisateur

SELECT
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  pl.ai_help_count,
  pl.ai_tokens,
  pl.meeting_count,
  pl.summary_count,
  pl.vocab_words
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
JOIN plan_limits pl ON pl.plan_id = sp.id
WHERE us.user_id = 'USER_ID_ICI'
  AND us.status = 'active';

-- ========================================
-- SECTION 6: VÉRIFIER SI LE PLAN FREE A DES LIMITES
-- ========================================
-- Cas particulier: si l'utilisateur n'a pas d'abonnement actif,
-- il est sur le plan Free par défaut

SELECT
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  pl.ai_help_count,
  pl.ai_tokens,
  pl.meeting_count,
  pl.summary_count,
  pl.vocab_words
FROM subscription_plans sp
JOIN plan_limits pl ON pl.plan_id = sp.id
WHERE sp.name = 'free';

-- ========================================
-- SECTION 7: SIMULER UN QUOTA ÉPUISÉ (POUR TESTER)
-- ========================================
-- ⚠️ ATTENTION: Cette requête MODIFIE les données
-- Utilise-la pour forcer un quota à 100% et tester le blocage

-- DÉCOMMENTER POUR EXÉCUTER:
-- INSERT INTO user_quotas (user_id, feature, usage_count, usage_month)
-- VALUES ('USER_ID_ICI', 'ai_help_count', 3, TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
-- ON CONFLICT (user_id, feature, usage_month)
-- DO UPDATE SET usage_count = 3;

-- ========================================
-- SECTION 8: RÉINITIALISER LE QUOTA (POUR TESTER)
-- ========================================
-- ⚠️ ATTENTION: Cette requête SUPPRIME les données
-- Utilise-la pour remettre le quota à zéro

-- DÉCOMMENTER POUR EXÉCUTER:
-- DELETE FROM user_quotas
-- WHERE user_id = 'USER_ID_ICI'
--   AND feature = 'ai_help_count'
--   AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- ========================================
-- SECTION 9: VÉRIFIER L'HISTORIQUE DES QUOTAS
-- ========================================
-- Affiche l'historique complet des quotas pour cet utilisateur

SELECT
  feature,
  usage_count,
  usage_month,
  created_at,
  updated_at
FROM user_quotas
WHERE user_id = 'USER_ID_ICI'
ORDER BY usage_month DESC, feature;

-- ========================================
-- SECTION 10: TEST COMPLET AVEC RÉSULTAT DÉTAILLÉ
-- ========================================
-- Affiche tout ce qu'il faut savoir sur le quota ai_help_count

WITH user_info AS (
  SELECT
    u.id,
    u.email,
    u.role,
    COALESCE(sp.name, 'free') as plan_name,
    COALESCE(sp.display_name, 'Free') as plan_display_name
  FROM auth.users u
  LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE u.id = 'USER_ID_ICI'
),
quota_info AS (
  SELECT
    uq.usage_count,
    pl.ai_help_count as limit_value
  FROM user_quotas uq
  LEFT JOIN user_subscriptions us ON us.user_id = uq.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
  LEFT JOIN plan_limits pl ON pl.plan_id = sp.id
  WHERE uq.user_id = 'USER_ID_ICI'
    AND uq.feature = 'ai_help_count'
    AND uq.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
SELECT
  ui.id as user_id,
  ui.email,
  ui.role,
  ui.plan_name,
  ui.plan_display_name,
  COALESCE(qi.usage_count, 0) as current_usage,
  CASE
    WHEN ui.role = 'admin' THEN -1
    WHEN qi.limit_value IS NULL THEN (
      SELECT ai_help_count FROM plan_limits pl2
      JOIN subscription_plans sp2 ON sp2.id = pl2.plan_id
      WHERE sp2.name = 'free'
    )
    ELSE qi.limit_value
  END as quota_limit,
  CASE
    WHEN ui.role = 'admin' THEN true
    WHEN qi.limit_value = -1 THEN true
    WHEN qi.limit_value IS NULL THEN COALESCE(qi.usage_count, 0) < (
      SELECT ai_help_count FROM plan_limits pl2
      JOIN subscription_plans sp2 ON sp2.id = pl2.plan_id
      WHERE sp2.name = 'free'
    )
    ELSE COALESCE(qi.usage_count, 0) < qi.limit_value
  END as has_access,
  CASE
    WHEN ui.role = 'admin' THEN 0
    WHEN qi.limit_value = -1 THEN 0
    WHEN qi.limit_value IS NULL THEN ROUND((COALESCE(qi.usage_count, 0)::numeric / NULLIF((
      SELECT ai_help_count FROM plan_limits pl2
      JOIN subscription_plans sp2 ON sp2.id = pl2.plan_id
      WHERE sp2.name = 'free'
    ), 0)::numeric) * 100, 2)
    ELSE ROUND((COALESCE(qi.usage_count, 0)::numeric / NULLIF(qi.limit_value, 0)::numeric) * 100, 2)
  END as percentage_used
FROM user_info ui
LEFT JOIN quota_info qi ON true;
