-- Vérification simple des doublons d'automatisations
-- À exécuter pour identifier le problème exact

-- =====================================================
-- 1. VÉRIFIER LES DOUBLONS PAR NOM
-- =====================================================

SELECT 
  '🔍 DOUBLONS PAR USER_ID + NAME' as check_type,
  user_id,
  name,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as automation_ids,
  array_agg(created_at::text ORDER BY created_at) as created_dates,
  array_agg(is_active::text ORDER BY created_at) as active_statuses
FROM automations
WHERE is_active = true
GROUP BY user_id, name
HAVING COUNT(*) > 1
ORDER BY count DESC, user_id, name;

-- =====================================================
-- 2. VÉRIFIER TOUTES LES AUTOMATIONS ACTIVES
-- =====================================================

SELECT 
  '📋 TOUTES LES AUTOMATIONS ACTIVES' as check_type,
  id,
  user_id,
  name,
  is_active,
  user_local_time,
  user_timezone,
  last_executed_at,
  next_execution_at,
  execution_lock,
  created_at
FROM automations
WHERE is_active = true
  AND user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5' -- Votre user_id
ORDER BY name, created_at;

-- =====================================================
-- 3. COMPTER PAR NOM
-- =====================================================

SELECT 
  '📊 COMPTE PAR NOM' as check_type,
  name,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users
FROM automations
WHERE is_active = true
  AND user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5' -- Votre user_id
GROUP BY name
ORDER BY name;

