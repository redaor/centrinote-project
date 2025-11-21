-- =====================================================
-- DÉCLENCHER LE SCHEDULER MAINTENANT
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- Déclencher manuellement le scheduler pour tester l'exécution immédiate
SELECT
  net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'scheduled_by', 'manual_trigger',
      'timestamp', NOW()
    )
  ) AS request_id;

-- Note : Attendre 5-10 secondes puis vérifier :
-- 1. Les logs de automation-scheduler dans Edge Functions
-- 2. Les logs de automation-micro-runner
-- 3. Les logs de automation-email
-- 4. Les exécutions dans automation_executions

