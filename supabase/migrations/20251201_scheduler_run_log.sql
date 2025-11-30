-- Migration pour créer la table de log brut des exécutions du scheduler
-- Date: 2025-12-01
-- Objectif: Tracer chaque invocation du scheduler pour identifier les exécutions multiples

-- =====================================================
-- 1. TABLE DE LOG BRUT DES EXÉCUTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduler_run_log (
  id SERIAL PRIMARY KEY,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduler_run_id TEXT NOT NULL,
  caller_ip TEXT,
  user_agent TEXT,
  automation_name TEXT,
  automation_id UUID,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Index pour éviter les doublons de log
  CONSTRAINT unique_run_automation UNIQUE (scheduler_run_id, automation_id)
);

-- Index pour les requêtes de diagnostic
CREATE INDEX IF NOT EXISTS idx_scheduler_run_log_received_at 
ON scheduler_run_log(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduler_run_log_scheduler_run_id 
ON scheduler_run_log(scheduler_run_id);

CREATE INDEX IF NOT EXISTS idx_scheduler_run_log_automation_name 
ON scheduler_run_log(automation_name) 
WHERE automation_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduler_run_log_execution_time 
ON scheduler_run_log(execution_time DESC);

COMMENT ON TABLE scheduler_run_log IS 
  'Table de log brut pour tracer chaque invocation du scheduler et identifier les exécutions multiples';

COMMENT ON COLUMN scheduler_run_log.scheduler_run_id IS 
  'ID unique de chaque exécution du scheduler';

COMMENT ON COLUMN scheduler_run_log.caller_ip IS 
  'IP de l''appelant (x-forwarded-for header)';

COMMENT ON COLUMN scheduler_run_log.user_agent IS 
  'User-Agent de l''appelant (peut révéler la source: Supabase, cron, webhook, etc.)';

COMMENT ON COLUMN scheduler_run_log.automation_name IS 
  'Nom de l''automatisation traitée (NULL si c''est juste l''entrée du scheduler)';

COMMENT ON COLUMN scheduler_run_log.automation_id IS 
  'ID de l''automatisation traitée (NULL si c''est juste l''entrée du scheduler)';

-- =====================================================
-- 2. FONCTION POUR NETTOYER LES VIEUX LOGS (optionnel)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_scheduler_logs(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM scheduler_run_log
  WHERE received_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_scheduler_logs IS 
  'Nettoie les logs du scheduler plus anciens que X jours. Par défaut: 7 jours.';

-- =====================================================
-- 3. RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Table de log scheduler créée !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table: scheduler_run_log';
  RAISE NOTICE '   - Log chaque entrée du scheduler';
  RAISE NOTICE '   - Log chaque automatisation traitée';
  RAISE NOTICE '   - Trace: scheduler_run_id, caller_ip, user_agent';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour diagnostiquer demain:';
  RAISE NOTICE '   SELECT * FROM scheduler_run_log';
  RAISE NOTICE '   WHERE execution_time >= ''2025-12-02 09:30:00''';
  RAISE NOTICE '   ORDER BY received_at;';
  RAISE NOTICE '';
END $$;

