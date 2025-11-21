-- =====================================================
-- FIX CRON : Exécuter toutes les minutes pour détecter les heures exactes
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- Supprimer l'ancien job horaire (qui tourne seulement à la minute 0)
DO $$
BEGIN
  PERFORM cron.unschedule('automation-scheduler-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Créer un nouveau job qui tourne TOUTES LES MINUTES
-- Cela permet de détecter n'importe quelle heure (08:35, 09:15, etc.)
-- ⚠️ REMPLACER les valeurs ci-dessous par vos vraies valeurs Supabase PRODUCTION
-- Settings → API → Project URL et Service Role Key

SELECT cron.schedule(
  'automation-scheduler-every-minute',
  '* * * * *', -- Toutes les minutes
  $$
  SELECT
    net.http_post(
      url := 'https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/automation-scheduler',  -- ⚠️ REMPLACER
      headers := jsonb_build_object(
        'Authorization', 'Bearer VOTRE_SERVICE_ROLE_KEY_ICI',  -- ⚠️ REMPLACER
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'scheduled_by', 'pg_cron_every_minute',
        'timestamp', NOW()
      )
    ) AS request_id;
  $$
);

-- Vérifier que le job est bien créé
SELECT 
  jobid,
  schedule,
  jobname,
  active
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;

-- Note : Le job "automation-scheduler-every-5min" peut rester comme backup
-- Mais le job "automation-scheduler-every-minute" sera le principal

