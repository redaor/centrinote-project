-- =====================================================
-- DÉCLENCHER LE SCHEDULER DIRECTEMENT (SANS CONFIG)
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- ⚠️ IMPORTANT : Remplacez ces valeurs par vos vraies valeurs
-- Trouvez-les dans : Supabase Dashboard → Settings → API
--   - Project URL : https://wjzlicokhxitmeoxkjzv.supabase.co
--   - service_role key : (dans la section "Project API keys")

-- Option 1 : Utiliser net.http_post (si extension pg_net disponible)
-- ⚠️ IMPORTANT : Remplacez VOTRE_SERVICE_ROLE_KEY par votre vraie clé depuis Supabase Dashboard
SELECT
  net.http_post(
    url := 'https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/automation-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY_ICI',  -- ⚠️ REMPLACER - Settings → API → service_role key
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'scheduled_by', 'manual_trigger_sql',
      'timestamp', NOW()
    )
  ) AS request_id;

-- Option 2 : Si net.http_post ne fonctionne pas, utilisez le Dashboard Supabase
-- Edge Functions → automation-scheduler → "Invoke function" → Body: {"scheduled_by": "manual_trigger"}

