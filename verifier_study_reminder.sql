-- =====================================================
-- VÉRIFICATION DE L'AUTOMATISATION study-reminder
-- =====================================================

-- 1. Vérifier l'état actuel de l'automatisation study-reminder
SELECT 
  id,
  name,
  user_id,
  is_active,
  trigger_type,
  trigger_config,
  action_type,
  action_config,
  user_local_time,
  user_timezone,
  next_execution_at,
  last_executed_at,
  execution_count,
  success_count,
  failure_count,
  created_at,
  updated_at
FROM automations
WHERE name = 'study-reminder'
ORDER BY created_at DESC;

-- 2. Vérifier si le cron automation-scheduler fonctionne
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;

-- 3. Vérifier les dernières exécutions du scheduler
SELECT 
  id,
  automation_id,
  status,
  started_at,
  completed_at,
  execution_time_ms,
  error_message
FROM automation_executions
WHERE automation_id IN (
  SELECT id FROM automations WHERE name = 'study-reminder'
)
ORDER BY started_at DESC
LIMIT 10;

-- 4. Vérifier l'heure actuelle et comparer avec next_execution_at
SELECT 
  NOW() AS utc_now,
  NOW() AT TIME ZONE 'Africa/Algiers' AS algiers_now,
  TO_CHAR(NOW() AT TIME ZONE 'Africa/Algiers', 'HH24:MI') AS algiers_time_formatted,
  a.name,
  a.user_local_time AS heure_configurée,
  a.user_timezone AS timezone_configuré,
  a.next_execution_at,
  TO_CHAR(NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'), 'HH24:MI') AS heure_actuelle_locale,
  CASE
    WHEN TO_CHAR(NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris'), 'HH24:MI') = a.user_local_time
    THEN '✅ C''est l''heure !'
    ELSE '⏰ Pas encore l''heure'
  END AS statut
FROM automations a
WHERE a.name = 'study-reminder' AND a.is_active = true;

-- 5. Vérifier si automation-notification a été appelée (via les logs d'exécution)
SELECT 
  id,
  automation_id,
  status,
  trigger_data,
  action_result,
  started_at,
  completed_at,
  error_message
FROM automation_executions
WHERE trigger_data->>'template_id' = 'study-reminder'
   OR trigger_data->>'micro_template' = 'true'
ORDER BY started_at DESC
LIMIT 10;

