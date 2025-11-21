-- =====================================================
-- VÉRIFIER L'EXÉCUTION APRÈS DÉCLENCHEMENT MANUEL
-- À exécuter 5-10 secondes après trigger_scheduler_now.sql
-- =====================================================

-- 1. Vérifier les exécutions créées dans les dernières minutes
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
  ae.action_result->>'quote_sent' as quote_sent,
  ae.action_result->>'quote_body' as quote_body
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.started_at >= NOW() - INTERVAL '2 minutes'
ORDER BY ae.started_at DESC;

-- 2. Vérifier si l'automation a été mise à jour
SELECT 
  id,
  name,
  last_executed_at,
  execution_count,
  success_count,
  failure_count,
  next_execution_at,
  updated_at
FROM automations
WHERE name = 'daily_quote';

-- 3. Vérifier les erreurs récentes
SELECT 
  ae.id,
  a.name as automation_name,
  ae.status,
  ae.error_message,
  ae.started_at,
  ae.trigger_data
FROM automation_executions ae
LEFT JOIN automations a ON ae.automation_id = a.id
WHERE ae.status = 'failed'
  AND ae.started_at >= NOW() - INTERVAL '2 minutes'
ORDER BY ae.started_at DESC;

