-- =====================================================
-- DÉCLENCHER LE SCHEDULER MAINTENANT (VERSION FIXÉE)
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- ⚠️ REMPLACER ces valeurs par vos vraies valeurs Supabase PRODUCTION
-- Vous pouvez les trouver dans : Settings → API → Project URL et Service Role Key

DO $$
DECLARE
  supabase_url TEXT := 'https://wjzlicokhxitmeoxkjzv.supabase.co';  -- ⚠️ REMPLACER par votre URL Supabase
  service_role_key TEXT := 'VOTRE_SERVICE_ROLE_KEY_ICI';  -- ⚠️ REMPLACER par votre Service Role Key
  request_result jsonb;
BEGIN
  -- Appeler le scheduler
  SELECT content INTO request_result
  FROM http((
    'POST',
    supabase_url || '/functions/v1/automation-scheduler',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'scheduled_by', 'manual_trigger',
      'timestamp', NOW()
    )::text
  )::http_request);
  
  RAISE NOTICE '✅ Scheduler déclenché: %', request_result;
END $$;

-- Alternative : Si http() n'est pas disponible, utiliser net.http_post
-- (nécessite l'extension pg_net)
SELECT
  net.http_post(
    url := 'https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/automation-scheduler',  -- ⚠️ REMPLACER
    headers := jsonb_build_object(
      'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY_ICI',  -- ⚠️ REMPLACER
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'scheduled_by', 'manual_trigger',
      'timestamp', NOW()
    )
  ) AS request_id;

-- Note : Attendre 5-10 secondes puis vérifier les logs et exécutions

