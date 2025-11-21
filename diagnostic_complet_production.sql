-- =====================================================
-- DIAGNOSTIC COMPLET PRODUCTION - TRACE COMPLÈTE
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
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
  success_count,
  failure_count,
  updated_at
FROM automations
WHERE name = 'daily_quote'
ORDER BY updated_at DESC;

-- 2. Vérifier TOUTES les exécutions récentes (24h)
SELECT 
  ae.id,
  ae.automation_id,
  a.name as automation_name,
  ae.status,
  ae.started_at,
  ae.completed_at,
  ae.execution_time_ms,
  ae.error_message,
  ae.trigger_data->>'scheduled_by' as scheduled_by,
  ae.trigger_data->>'scheduler_run_id' as scheduler_run_id,
  ae.action_result
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY ae.started_at DESC
LIMIT 50;

-- 3. Vérifier spécifiquement les exécutions de daily_quote
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
  ae.action_result->>'quote_sent' as quote_sent,
  ae.action_result->>'quote_id' as quote_id,
  ae.trigger_data
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE (a.name = 'daily_quote' OR a.name LIKE '%quote%')
  AND ae.started_at >= NOW() - INTERVAL '7 days'
ORDER BY ae.started_at DESC;

-- 4. Statistiques des exécutions
SELECT 
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'running') as running_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  MIN(started_at) as first_execution,
  MAX(started_at) as last_execution
FROM automation_executions
WHERE started_at >= NOW() - INTERVAL '24 hours';

-- 5. Vérifier les erreurs récentes
SELECT 
  ae.id,
  a.name as automation_name,
  ae.status,
  ae.error_message,
  ae.started_at,
  ae.trigger_data,
  ae.action_result
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.status = 'failed'
  AND ae.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY ae.started_at DESC
LIMIT 20;

-- 6. Vérifier l'heure actuelle vs heure configurée
SELECT 
  NOW() as current_utc_time,
  NOW() AT TIME ZONE 'Africa/Algiers' as current_local_time_algiers,
  EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Algiers')) as current_hour,
  EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Algiers')) as current_minute,
  a.user_local_time as automation_target_time,
  CASE 
    WHEN EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris')))::TEXT || ':' || 
         LPAD(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(a.user_timezone, 'Europe/Paris')))::TEXT, 2, '0') = a.user_local_time
    THEN '✅ DOIT S''EXÉCUTER MAINTENANT'
    ELSE '⏳ Pas encore l''heure'
  END as execution_status
FROM automations a
WHERE a.name = 'daily_quote'
  AND a.is_active = true;

