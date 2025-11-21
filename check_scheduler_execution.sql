-- =====================================================
-- VÉRIFICATION EXÉCUTION SCHEDULER
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- 1. Vérifier l'automation daily_quote (déjà fait, mais on vérifie)
SELECT 
  id,
  name,
  is_active,
  user_local_time,
  user_timezone,
  next_execution_at,
  last_executed_at,
  execution_count,
  updated_at
FROM automations
WHERE name = 'daily_quote'
  AND is_active = true;

-- 2. Vérifier les exécutions du scheduler (via automation_executions)
-- Chercher les exécutions liées au scheduler
SELECT 
  ae.id,
  ae.automation_id,
  a.name as automation_name,
  ae.status,
  ae.started_at,
  ae.completed_at,
  ae.error_message,
  ae.trigger_data->>'scheduled_by' as scheduled_by,
  ae.trigger_data->>'scheduler_run_id' as scheduler_run_id
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.trigger_data->>'scheduled_by' IS NOT NULL
  AND ae.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY ae.started_at DESC
LIMIT 20;

-- 3. Vérifier si le cron horaire a bien tourné
-- (On ne peut pas vérifier directement, mais on peut voir les résultats)
SELECT 
  COUNT(*) as total_executions_last_24h,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'running') as running_count
FROM automation_executions
WHERE started_at >= NOW() - INTERVAL '24 hours';

-- 4. Vérifier l'heure actuelle UTC et locale
SELECT 
  NOW() as current_utc_time,
  NOW() AT TIME ZONE 'Africa/Algiers' as current_local_time_algiers,
  EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Algiers')) as current_hour_local,
  EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Algiers')) as current_minute_local;

-- 5. Vérifier si l'automation devrait s'exécuter MAINTENANT
-- (Si l'heure locale actuelle correspond à user_local_time)
SELECT 
  a.id,
  a.name,
  a.user_local_time,
  a.user_timezone,
  a.is_active,
  EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'))) as current_hour,
  EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'))) as current_minute,
  SPLIT_PART(a.user_local_time, ':', 1)::INT as target_hour,
  SPLIT_PART(a.user_local_time, ':', 2)::INT as target_minute,
  CASE 
    WHEN EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris')))::TEXT || ':' || 
         LPAD(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris')))::TEXT, 2, '0') = a.user_local_time
    THEN '✅ DOIT S''EXÉCUTER MAINTENANT'
    ELSE '⏳ Pas encore l''heure'
  END as execution_status
FROM automations a
WHERE a.name = 'daily_quote'
  AND a.is_active = true
  AND a.user_local_time IS NOT NULL;

