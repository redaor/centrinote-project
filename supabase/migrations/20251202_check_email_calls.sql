-- Script pour vérifier combien de fois automation-email est appelé
-- Alternative à edge_function_logs qui n'existe pas dans Supabase

-- 1. Vérifier les emails enregistrés dans email_sent_log
SELECT 
  '📊 EMAILS ENREGISTRÉS DANS email_sent_log' as check_type,
  COUNT(*) as total_emails,
  COUNT(DISTINCT email_to) as unique_recipients,
  COUNT(DISTINCT email_subject) as unique_subjects
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour';

-- 2. Voir les emails envoyés récemment avec détails
SELECT 
  email_to,
  email_subject,
  sent_at,
  EXTRACT(EPOCH FROM (NOW() - sent_at)) / 60 as minutes_ago
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour'
ORDER BY sent_at DESC
LIMIT 20;

-- 3. Trouver les doublons potentiels (devrait être 0 si la protection fonctionne)
SELECT 
  '🚨 DOUBLONS DÉTECTÉS' as check_type,
  email_to,
  email_subject,
  COUNT(*) as duplicate_count,
  MIN(sent_at) as first_sent,
  MAX(sent_at) as last_sent,
  EXTRACT(EPOCH FROM (MAX(sent_at) - MIN(sent_at))) / 60 as minutes_between
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour'
GROUP BY email_to, email_subject
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, last_sent DESC;

-- 4. Vérifier les automations exécutées récemment
SELECT 
  '📋 AUTOMATIONS EXÉCUTÉES' as check_type,
  name,
  last_executed_at,
  execution_count,
  EXTRACT(EPOCH FROM (NOW() - last_executed_at)) / 60 as minutes_since_last_execution
FROM automations
WHERE name IN ('daily_quote', 'weekly-summary', 'monthly-report')
  AND last_executed_at >= NOW() - INTERVAL '1 hour'
ORDER BY last_executed_at DESC;

-- 5. Vérifier les logs du scheduler (si la table existe)
SELECT 
  '📅 SCHEDULER RUNS' as check_type,
  COUNT(*) as total_runs,
  COUNT(DISTINCT scheduler_run_id) as unique_runs,
  COUNT(DISTINCT automation_name) as unique_automations
FROM scheduler_run_log
WHERE execution_time >= NOW() - INTERVAL '1 hour'
  AND automation_name IN ('daily_quote', 'weekly-summary', 'monthly-report');

-- 6. Résumé final
SELECT 
  '📊 RÉSUMÉ' as summary,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent_log')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_log_email_send')
    THEN '✅ Système de dédoublonnage opérationnel'
    ELSE '❌ Migration non appliquée'
  END as system_status,
  (SELECT COUNT(*) FROM email_sent_log WHERE sent_at >= NOW() - INTERVAL '1 hour') as emails_last_hour,
  (SELECT COUNT(*) FROM email_sent_log 
   WHERE sent_at >= NOW() - INTERVAL '1 hour' 
   GROUP BY email_to, email_subject 
   HAVING COUNT(*) > 1) as duplicates_detected;

