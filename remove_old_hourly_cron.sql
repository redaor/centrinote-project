-- =====================================================
-- SUPPRIMER L'ANCIEN JOB HORAIRE
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- Supprimer le job "automation-scheduler-hourly" qui tourne seulement à la minute 0
DO $$
BEGIN
  PERFORM cron.unschedule('automation-scheduler-hourly');
  RAISE NOTICE '✅ Job automation-scheduler-hourly supprimé';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ℹ️ Job automation-scheduler-hourly n''existe pas ou déjà supprimé';
END $$;

-- Vérifier que le job a bien été supprimé
SELECT 
  jobid,
  schedule,
  jobname,
  active
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;

