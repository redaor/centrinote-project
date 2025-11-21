-- =====================================================
-- DIAGNOSTIC PRODUCTION - VÉRIFICATION EMAIL
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- 1. Vérifier les exécutions récentes de daily_quote
SELECT 
  ae.id,
  ae.automation_id,
  a.name as automation_name,
  a.user_id,
  a.is_active,
  a.user_local_time,
  a.user_timezone,
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
WHERE (a.name = 'daily_quote' OR a.name LIKE '%quote%')
  AND ae.started_at >= NOW() - INTERVAL '7 days'
ORDER BY ae.started_at DESC
LIMIT 20;

-- 2. Vérifier les automations daily_quote actives
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
  success_count,
  failure_count,
  created_at,
  updated_at
FROM automations
WHERE (name = 'daily_quote' OR name LIKE '%quote%')
  AND is_active = true
ORDER BY updated_at DESC;

-- 3. Vérifier les logs d'erreur récents
SELECT 
  ae.id,
  a.name as automation_name,
  ae.status,
  ae.error_message,
  ae.started_at,
  ae.action_result
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.status = 'failed'
  AND ae.started_at >= NOW() - INTERVAL '7 days'
ORDER BY ae.started_at DESC
LIMIT 10;

