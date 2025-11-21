-- =====================================================
-- TEST MANUEL D'EXÉCUTION EN PRODUCTION
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- Ce script déclenche manuellement l'automation daily_quote
-- pour tester si le problème vient du scheduler ou de l'exécution elle-même

-- ÉTAPE 1 : Appeler automation-micro-runner directement
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-micro-runner',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'templateId', 'daily_quote',
      'userId', 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5',  -- ⚠️ REMPLACER par votre user_id si différent
      'config', jsonb_build_object()
    )
  ) AS request_id_micro_runner;

-- ÉTAPE 2 : Vérifier les logs après quelques secondes
-- (Exécuter cette requête 5-10 secondes après l'étape 1)
SELECT 
  ae.id,
  ae.automation_id,
  ae.status,
  ae.started_at,
  ae.completed_at,
  ae.error_message,
  ae.action_result->>'quote_sent' as quote_sent,
  ae.action_result->>'quote_body' as quote_body
FROM automation_executions ae
WHERE ae.started_at >= NOW() - INTERVAL '1 minute'
ORDER BY ae.started_at DESC
LIMIT 5;

-- ÉTAPE 3 : Tester directement automation-email
-- (Pour vérifier si le problème vient de l'envoi d'email)
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'to', 'votre-email@test.com',  -- ⚠️ REMPLACER par votre email
      'subject', '🧪 Test Email Production - Centrinote',
      'body', 'Test d''envoi d''email depuis production',
      'html', '<h1>Test Email Production</h1><p>Si vous recevez ce message, la configuration SMTP est correcte.</p>'
    )
  ) AS request_id_email;

-- Note : Vérifier les logs de automation-email dans Edge Functions → automation-email → Logs

