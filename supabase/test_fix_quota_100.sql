-- ========================================
-- TEST DU FIX : Quota à 100%
-- ========================================
-- Ce script teste que le fix `percentage < 100` fonctionne correctement
--
-- INSTRUCTIONS:
-- 1. Remplace 'USER_ID_ICI' par ton vrai user ID
-- 2. Exécute chaque section dans l'ordre
-- 3. Vérifie les résultats attendus
-- ========================================

-- ========================================
-- SECTION 1: ÉTAT INITIAL
-- ========================================
-- Affiche l'état actuel du quota ai_help_count

SELECT
  uq.user_id,
  uq.feature,
  uq.usage_count,
  pl.ai_help_count as limit_value,
  ROUND((uq.usage_count::numeric / NULLIF(pl.ai_help_count, 0)::numeric) * 100, 2) as percentage
FROM user_quotas uq
LEFT JOIN user_subscriptions us ON us.user_id = uq.user_id AND us.status = 'active'
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
LEFT JOIN plan_limits pl ON pl.plan_id = sp.id
WHERE uq.user_id = 'USER_ID_ICI'
  AND uq.feature = 'ai_help_count'
  AND uq.usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Si aucun résultat, le quota n'a jamais été utilisé (c'est normal)

-- ========================================
-- SECTION 2: FORCER LE QUOTA À 99% (2/3)
-- ========================================
-- Simule un utilisateur qui a utilisé 2 fois sur 3 (66%)

INSERT INTO user_quotas (user_id, feature, usage_count, usage_month)
VALUES ('USER_ID_ICI', 'ai_help_count', 2, TO_CHAR(CURRENT_DATE, 'YYYY-MM'))
ON CONFLICT (user_id, feature, usage_month)
DO UPDATE SET usage_count = 2;

-- Vérifier le résultat
SELECT check_quota('USER_ID_ICI', 'ai_help_count', 0);

-- RÉSULTAT ATTENDU:
-- {
--   "allowed": true,
--   "usage": 2,
--   "limit": 3,
--   "percentage": 66.67
-- }
-- ✅ allowed: true && percentage < 100 = TRUE → Bouton actif

-- ========================================
-- SECTION 3: FORCER LE QUOTA À 100% (3/3)
-- ========================================
-- Simule un utilisateur qui a épuisé son quota

UPDATE user_quotas
SET usage_count = 3
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Vérifier le résultat
SELECT check_quota('USER_ID_ICI', 'ai_help_count', 0);

-- RÉSULTAT ATTENDU (AVEC LE BUG):
-- {
--   "allowed": true,    ⚠️ BUG : devrait être false
--   "usage": 3,
--   "limit": 3,
--   "percentage": 100
-- }
-- ❌ allowed: true && percentage < 100 = FALSE → Bouton grisé (grâce au fix)

-- ========================================
-- SECTION 4: FORCER LE QUOTA À 133% (4/3)
-- ========================================
-- Simule un utilisateur qui a dépassé son quota (cas extrême)

UPDATE user_quotas
SET usage_count = 4
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Vérifier le résultat
SELECT check_quota('USER_ID_ICI', 'ai_help_count', 0);

-- RÉSULTAT ATTENDU:
-- {
--   "allowed": false,
--   "usage": 4,
--   "limit": 3,
--   "percentage": 133.33
-- }
-- ❌ allowed: false && percentage < 100 = FALSE → Bouton grisé

-- ========================================
-- SECTION 5: TESTER AVEC INCREMENT = 1
-- ========================================
-- Simule ce qui se passe quand l'utilisateur essaie d'utiliser l'IA
-- (increment = 1 au lieu de 0)

-- Réinitialiser à 2/3 d'abord
UPDATE user_quotas
SET usage_count = 2
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Tester avec increment = 1 (simule utilisation)
SELECT check_quota('USER_ID_ICI', 'ai_help_count', 1);

-- RÉSULTAT ATTENDU:
-- {
--   "allowed": true,    ✅ 2 + 1 = 3, c'est OK
--   "usage": 2,
--   "limit": 3,
--   "percentage": 66.67
-- }

-- Maintenant à 3/3, tester avec increment = 1
UPDATE user_quotas
SET usage_count = 3
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

SELECT check_quota('USER_ID_ICI', 'ai_help_count', 1);

-- RÉSULTAT ATTENDU:
-- {
--   "allowed": false,   ✅ 3 + 1 = 4 > 3, dépassement
--   "usage": 3,
--   "limit": 3,
--   "percentage": 100
-- }

-- ========================================
-- SECTION 6: RÉINITIALISER LE QUOTA
-- ========================================
-- Supprime le quota pour recommencer à zéro

DELETE FROM user_quotas
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Vérifier le résultat
SELECT check_quota('USER_ID_ICI', 'ai_help_count', 0);

-- RÉSULTAT ATTENDU:
-- {
--   "allowed": true,
--   "usage": 0,
--   "limit": 3,
--   "percentage": 0
-- }
-- ✅ allowed: true && percentage < 100 = TRUE → Bouton actif

-- ========================================
-- SECTION 7: TEST COMPLET AVEC SCÉNARIOS
-- ========================================
-- Teste tous les cas de figure en une seule requête

WITH test_scenarios AS (
  SELECT
    '0/3 (0%)' as scenario,
    0 as usage,
    3 as limit,
    0 as increment
  UNION ALL
  SELECT '1/3 (33%)', 1, 3, 0
  UNION ALL
  SELECT '2/3 (66%)', 2, 3, 0
  UNION ALL
  SELECT '3/3 (100%)', 3, 3, 0
  UNION ALL
  SELECT '4/3 (133%)', 4, 3, 0
  UNION ALL
  SELECT '2/3 avec +1', 2, 3, 1
  UNION ALL
  SELECT '3/3 avec +1', 3, 3, 1
)
SELECT
  scenario,
  usage,
  limit,
  increment,
  (usage + increment) <= limit as check_quota_allowed,
  ROUND((usage::numeric / limit::numeric) * 100, 2) as percentage,
  -- Logique du fix
  ((usage + increment) <= limit) AND (ROUND((usage::numeric / limit::numeric) * 100, 2) < 100) as fix_allowed
FROM test_scenarios;

-- RÉSULTAT ATTENDU:
-- | scenario      | usage | limit | increment | check_quota_allowed | percentage | fix_allowed |
-- |---------------|-------|-------|-----------|---------------------|------------|-------------|
-- | 0/3 (0%)      | 0     | 3     | 0         | true                | 0.00       | true  ✅    |
-- | 1/3 (33%)     | 1     | 3     | 0         | true                | 33.33      | true  ✅    |
-- | 2/3 (66%)     | 2     | 3     | 0         | true                | 66.67      | true  ✅    |
-- | 3/3 (100%)    | 3     | 3     | 0         | true                | 100.00     | false ✅    |
-- | 4/3 (133%)    | 4     | 3     | 0         | false               | 133.33     | false ✅    |
-- | 2/3 avec +1   | 2     | 3     | 1         | true                | 66.67      | true  ✅    |
-- | 3/3 avec +1   | 3     | 3     | 1         | false               | 100.00     | false ✅    |

-- ✅ Le fix bloque correctement à 100%
-- ✅ Le fix ne bloque PAS en dessous de 100%

-- ========================================
-- SECTION 8: NETTOYAGE FINAL
-- ========================================
-- Supprime le quota de test

DELETE FROM user_quotas
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Vérifier que c'est bien supprimé
SELECT COUNT(*) as remaining_test_quotas
FROM user_quotas
WHERE user_id = 'USER_ID_ICI'
  AND feature = 'ai_help_count'
  AND usage_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- RÉSULTAT ATTENDU: 0
