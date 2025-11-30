-- Migration pour ajouter un verrou global au scheduler et une fonction atomique
-- Date: 2025-12-01
-- Objectif: Éviter les race conditions avec FOR UPDATE et transaction atomique

-- =====================================================
-- 1. TABLE DE VERROU GLOBAL POUR LE SCHEDULER
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduler_locks (
  id TEXT PRIMARY KEY DEFAULT 'scheduler-global-lock',
  locked_until TIMESTAMP WITH TIME ZONE,
  locked_by TEXT, -- Identifiant du processus (scheduler_run_id)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE scheduler_locks IS 
  'Table de verrous globaux pour empêcher les exécutions multiples simultanées du scheduler';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_scheduler_locks_locked_until 
ON scheduler_locks(locked_until) 
WHERE locked_until IS NOT NULL;

-- =====================================================
-- 2. FONCTION POUR VERROU GLOBAL DU SCHEDULER
-- =====================================================

CREATE OR REPLACE FUNCTION try_lock_scheduler(
  p_lock_duration_minutes INTEGER DEFAULT 5,
  p_scheduler_run_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock TIMESTAMP WITH TIME ZONE;
  v_new_lock TIMESTAMP WITH TIME ZONE;
  v_rows_updated INTEGER;
BEGIN
  -- Récupérer le verrou actuel avec FOR UPDATE pour éviter les race conditions
  SELECT locked_until INTO v_current_lock
  FROM scheduler_locks
  WHERE id = 'scheduler-global-lock'
  FOR UPDATE;
  
  -- Si aucune ligne n'existe, en créer une
  IF v_current_lock IS NULL THEN
    INSERT INTO scheduler_locks (id, locked_until, locked_by)
    VALUES ('scheduler-global-lock', NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL, p_scheduler_run_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN v_rows_updated > 0;
  END IF;
  
  -- Si un verrou existe et n'est pas expiré, retourner false
  IF v_current_lock > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Poser un nouveau verrou
  v_new_lock := NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL;
  
  UPDATE scheduler_locks
  SET 
    locked_until = v_new_lock,
    locked_by = p_scheduler_run_id,
    updated_at = NOW()
  WHERE id = 'scheduler-global-lock'
    AND (locked_until IS NULL OR locked_until <= NOW());
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Vérifier si la mise à jour a réussi (verrou posé)
  RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION try_lock_scheduler IS 
  'Tente de poser un verrou global sur le scheduler pour éviter les exécutions multiples simultanées. Utilise FOR UPDATE pour éviter les race conditions.';

-- =====================================================
-- 3. FONCTION POUR LIBÉRER LE VERROU GLOBAL
-- =====================================================

CREATE OR REPLACE FUNCTION release_scheduler_lock()
RETURNS VOID AS $$
BEGIN
  UPDATE scheduler_locks
  SET 
    locked_until = NULL,
    locked_by = NULL,
    updated_at = NOW()
  WHERE id = 'scheduler-global-lock';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_scheduler_lock IS 
  'Libère le verrou global du scheduler.';

-- =====================================================
-- 4. FONCTION ATOMIQUE : VERROU + MISE À JOUR last_executed_at
-- =====================================================

CREATE OR REPLACE FUNCTION try_lock_and_update_automation(
  p_automation_id UUID,
  p_lock_duration_minutes INTEGER DEFAULT 5,
  p_execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock TIMESTAMP WITH TIME ZONE;
  v_new_lock TIMESTAMP WITH TIME ZONE;
  v_rows_updated INTEGER;
BEGIN
  -- Récupérer le verrou actuel avec FOR UPDATE pour éviter les race conditions
  SELECT execution_lock INTO v_current_lock
  FROM automations
  WHERE id = p_automation_id
  FOR UPDATE; -- ✅ FOR UPDATE pour éviter les race conditions
  
  -- Si l'automatisation n'existe pas
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Si un verrou existe et n'est pas expiré, retourner false
  IF v_current_lock IS NOT NULL AND v_current_lock > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Poser un nouveau verrou et mettre à jour last_executed_at dans la même transaction
  v_new_lock := p_execution_time + (p_lock_duration_minutes || ' minutes')::INTERVAL;
  
  UPDATE automations
  SET 
    execution_lock = v_new_lock,
    last_executed_at = p_execution_time, -- ✅ Mise à jour atomique dans la même transaction
    updated_at = p_execution_time
  WHERE id = p_automation_id
    AND (execution_lock IS NULL OR execution_lock <= NOW());
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Vérifier si la mise à jour a réussi (verrou posé)
  RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION try_lock_and_update_automation IS 
  'Tente de poser un verrou sur une automatisation ET met à jour last_executed_at dans la même transaction atomique. Utilise FOR UPDATE pour éviter les race conditions. Retourne TRUE si le verrou a été posé, FALSE sinon.';

-- =====================================================
-- 5. FONCTION POUR LIBÉRER LE VERROU ET METTRE À JOUR next_execution_at
-- =====================================================

CREATE OR REPLACE FUNCTION release_automation_lock_and_schedule_next(
  p_automation_id UUID,
  p_next_execution_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
  UPDATE automations
  SET 
    execution_lock = NULL,
    next_execution_at = p_next_execution_at,
    updated_at = NOW()
  WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_automation_lock_and_schedule_next IS 
  'Libère le verrou d''exécution d''une automatisation et programme la prochaine exécution.';

-- =====================================================
-- 6. NETTOYAGE DES VERRous EXPIRÉS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_scheduler_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Libérer les verrous expirés (plus de 10 minutes)
  UPDATE scheduler_locks
  SET 
    locked_until = NULL,
    locked_by = NULL,
    updated_at = NOW()
  WHERE locked_until IS NOT NULL
    AND locked_until < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_scheduler_locks IS 
  'Nettoie les verrous globaux du scheduler expirés.';

-- =====================================================
-- 7. INITIALISER LA TABLE DE VERROUS (si vide)
-- =====================================================

INSERT INTO scheduler_locks (id, locked_until, locked_by)
VALUES ('scheduler-global-lock', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Migration verrous globaux terminée !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Fonctions créées:';
  RAISE NOTICE '   1. ✅ try_lock_scheduler() - Verrou global du scheduler';
  RAISE NOTICE '   2. ✅ release_scheduler_lock() - Libération verrou global';
  RAISE NOTICE '   3. ✅ try_lock_and_update_automation() - Verrou atomique + last_executed_at';
  RAISE NOTICE '   4. ✅ release_automation_lock_and_schedule_next() - Libération + next_execution_at';
  RAISE NOTICE '   5. ✅ cleanup_expired_scheduler_locks() - Nettoyage verrous expirés';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Protection:';
  RAISE NOTICE '   - Verrou global au niveau scheduler (évite exécutions multiples)';
  RAISE NOTICE '   - Verrou atomique par automatisation (FOR UPDATE)';
  RAISE NOTICE '   - Mise à jour last_executed_at dans la même transaction';
  RAISE NOTICE '';
END $$;

