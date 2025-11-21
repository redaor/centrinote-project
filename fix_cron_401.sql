-- =====================================================
-- FIX 401 : Cron avec clé service_role en dur
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- ⚠️ IMPORTANT : Remplacez VOTRE_SERVICE_ROLE_KEY_ICI par votre vraie clé
-- Trouvable dans : Dashboard → Settings → API → service_role key

-- 1. Supprimer l'ancien cron (si existe)
DO $$
BEGIN
  PERFORM cron.unschedule('automation-scheduler-hourly');
  PERFORM cron.unschedule('automation-scheduler-every-minute');
  PERFORM cron.unschedule('automation-scheduler-final');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Créer le nouveau cron avec la clé en dur (évite les problèmes de variables PG)
SELECT cron.schedule(
  'automation-scheduler-final',
  '* * * * *', -- Toutes les minutes
  $$
  SELECT
    net.http_post(
      url := 'https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/automation-scheduler',
      headers := jsonb_build_object(
        'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY_ICI',  -- ⚠️ REMPLACER ICI
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'scheduled_by', 'pg_cron_final',
        'timestamp', NOW()
      )
    ) AS request_id;
  $$
);

-- 3. Vérifier que le cron est bien créé
SELECT 
  jobid,
  schedule,
  jobname,
  active
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;

-- Note : Cette version utilise la clé en dur dans le SQL
-- C'est plus simple et évite les problèmes de variables PG non configurées

