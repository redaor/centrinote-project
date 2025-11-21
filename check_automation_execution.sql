-- =====================================================
-- SCRIPT DE VÉRIFICATION DES EXÉCUTIONS D'AUTOMATISATION
-- À exécuter dans Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Vérifier l'automation daily_quote
SELECT 
  id,
  name,
  user_id,
  is_active,
  user_local_time,
  user_timezone,
  next_execution_at,
  last_executed_at,
  execution_count,
  created_at,
  updated_at
FROM automations
WHERE name = 'daily_quote'
  OR name LIKE '%quote%'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Vérifier les exécutions récentes (dernières 24h)
SELECT 
  ae.id,
  ae.automation_id,
  a.name as automation_name,
  ae.status,
  ae.started_at,
  ae.completed_at,
  ae.execution_time_ms,
  ae.error_message,
  ae.action_result->>'quote_sent' as quote_sent,
  ae.action_result->>'quote_body' as quote_body,
  ae.trigger_data
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY ae.started_at DESC
LIMIT 20;

-- 3. Vérifier les exécutions pour daily_quote spécifiquement
SELECT 
  ae.id,
  ae.automation_id,
  a.name as automation_name,
  a.user_id,
  ae.status,
  ae.started_at,
  ae.completed_at,
  ae.execution_time_ms,
  ae.error_message,
  ae.action_result,
  ae.trigger_data
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE (a.name = 'daily_quote' OR a.name LIKE '%quote%')
  AND ae.started_at >= NOW() - INTERVAL '7 days'
ORDER BY ae.started_at DESC;

-- 4. Vérifier le cron job pg_cron
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

