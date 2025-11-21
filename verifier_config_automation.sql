-- =====================================================
-- Vérifier la configuration réelle de l'automation
-- =====================================================

-- 1. Vérifier toutes les automations actives avec leur configuration
SELECT 
  id,
  name,
  user_local_time,
  user_timezone,
  is_active,
  last_executed_at,
  next_execution_at,
  created_at,
  updated_at
FROM automations
WHERE is_active = true
ORDER BY name;

-- 2. Vérifier spécifiquement daily_quote
SELECT 
  id,
  name,
  user_local_time,
  user_timezone,
  is_active,
  last_executed_at,
  next_execution_at,
  trigger_config,
  updated_at
FROM automations
WHERE name = 'daily_quote';

-- 3. Vérifier l'heure actuelle dans différents timezones
SELECT 
  NOW() AS utc_now,
  NOW() AT TIME ZONE 'Africa/Algiers' AS algiers_now,
  TO_CHAR(NOW() AT TIME ZONE 'Africa/Algiers', 'HH24:MI') AS algiers_time_formatted,
  NOW() AT TIME ZONE 'Europe/Paris' AS paris_now,
  TO_CHAR(NOW() AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS paris_time_formatted;

-- 4. Comparer l'heure configurée avec l'heure actuelle
SELECT 
  a.name,
  a.user_local_time AS heure_configurée,
  a.user_timezone AS timezone_configuré,
  TO_CHAR(NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'), 'HH24:MI') AS heure_actuelle_locale,
  CASE 
    WHEN TO_CHAR(NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'), 'HH24:MI') = a.user_local_time 
    THEN '✅ C''est l''heure !'
    ELSE '⏰ Pas encore l''heure'
  END AS statut
FROM automations a
WHERE a.is_active = true AND a.user_local_time IS NOT NULL;

