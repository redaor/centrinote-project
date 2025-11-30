-- Migration pour créer la table error_logs pour le monitoring
-- Date: 2025-12-01
-- Objectif: Stocker toutes les erreurs de l'application (frontend + backend) pour monitoring

-- =====================================================
-- 1. TABLE error_logs
-- =====================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  meta JSONB DEFAULT '{}',
  source TEXT, -- 'frontend', 'backend', 'edge-function', etc.
  stack_trace TEXT,
  url TEXT, -- URL de la page où l'erreur s'est produite (frontend)
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);

-- Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_error_logs_user_level_created 
ON error_logs(user_id, level, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON TABLE error_logs IS 
  'Table pour stocker toutes les erreurs de l''application (frontend + backend) pour monitoring et debugging';

COMMENT ON COLUMN error_logs.user_id IS 
  'ID de l''utilisateur concerné (NULL si erreur non authentifiée)';

COMMENT ON COLUMN error_logs.message IS 
  'Message d''erreur (sanitisé, sans données sensibles)';

COMMENT ON COLUMN error_logs.level IS 
  'Niveau de log: info, warn, error, debug';

COMMENT ON COLUMN error_logs.meta IS 
  'Métadonnées supplémentaires (JSON) - données sanitaires uniquement';

COMMENT ON COLUMN error_logs.source IS 
  'Source de l''erreur: frontend, backend, edge-function, etc.';

COMMENT ON COLUMN error_logs.stack_trace IS 
  'Stack trace de l''erreur (si disponible)';

COMMENT ON COLUMN error_logs.url IS 
  'URL de la page où l''erreur s''est produite (frontend uniquement)';

-- =====================================================
-- 2. RLS (Row Level Security)
-- =====================================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres erreurs
CREATE POLICY "Users can view their own error logs" 
ON error_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Le service role peut tout voir (pour le dashboard admin)
CREATE POLICY "Service role can view all error logs" 
ON error_logs FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Les utilisateurs peuvent insérer leurs propres erreurs
CREATE POLICY "Users can insert their own error logs" 
ON error_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Le service role peut tout insérer
CREATE POLICY "Service role can insert all error logs" 
ON error_logs FOR INSERT 
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Seul le service role peut supprimer (pour nettoyage)
CREATE POLICY "Service role can delete error logs" 
ON error_logs FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 3. FONCTION POUR NETTOYER LES VIEUX LOGS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_error_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_error_logs IS 
  'Nettoie les logs d''erreur plus anciens que X jours. Par défaut: 30 jours.';

-- =====================================================
-- 4. CRON JOB POUR NETTOYAGE AUTOMATIQUE (optionnel)
-- =====================================================

-- Supprimer le cron job s'il existe déjà
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-error-logs') THEN
    PERFORM cron.unschedule('cleanup-error-logs');
  END IF;
END $$;

-- Programmer le nettoyage quotidien (à minuit)
SELECT cron.schedule(
  'cleanup-error-logs',
  '0 0 * * *', -- Tous les jours à minuit
  'SELECT cleanup_old_error_logs(30);'
);

-- =====================================================
-- 5. RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Table error_logs créée !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Table: error_logs';
  RAISE NOTICE '   - Stocke toutes les erreurs (frontend + backend)';
  RAISE NOTICE '   - RLS activé (utilisateurs voient leurs erreurs)';
  RAISE NOTICE '   - Service role peut tout voir (dashboard admin)';
  RAISE NOTICE '   - Nettoyage automatique après 30 jours';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour voir les erreurs récentes:';
  RAISE NOTICE '   SELECT * FROM error_logs';
  RAISE NOTICE '   WHERE created_at > NOW() - INTERVAL ''24 hours''';
  RAISE NOTICE '   ORDER BY created_at DESC;';
  RAISE NOTICE '';
END $$;

