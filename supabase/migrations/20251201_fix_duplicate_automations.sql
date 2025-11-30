-- Migration pour corriger les exécutions multiples d'automatisations
-- Date: 2025-12-01
-- Problème: Les automations s'exécutent 3 fois à cause de schedulers multiples et absence de verrou

-- =====================================================
-- 1. VÉRIFIER ET SUPPRIMER LES DOUBLONS D'AUTOMATIONS
-- =====================================================

-- Trouver les doublons (même user_id + même name)
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  FOR dup_record IN
    SELECT user_id, name, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
    FROM automations
    WHERE is_active = true
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Doublon trouvé: user_id=%, name=%, count=%, ids=%', 
      dup_record.user_id, dup_record.name, dup_record.count, dup_record.ids;
    
    -- Garder le plus récent, supprimer les autres
    DELETE FROM automations
    WHERE user_id = dup_record.user_id
      AND name = dup_record.name
      AND id != dup_record.ids[array_length(dup_record.ids, 1)]; -- Garder le dernier (plus récent)
    
    RAISE NOTICE 'Doublons supprimés pour user_id=%, name=%', dup_record.user_id, dup_record.name;
  END LOOP;
END $$;

-- =====================================================
-- 2. AJOUTER UN INDEX UNIQUE POUR ÉVITER LES DOUBLONS
-- =====================================================

-- Supprimer l'index s'il existe déjà
DROP INDEX IF EXISTS idx_automations_user_name_unique;

-- Créer un index unique pour éviter les doublons futurs
CREATE UNIQUE INDEX idx_automations_user_name_unique 
ON automations(user_id, name) 
WHERE is_active = true;

-- =====================================================
-- 3. AJOUTER UNE COLONNE DE VERROU POUR LES EXÉCUTIONS
-- =====================================================

-- Ajouter une colonne pour verrouiller l'exécution
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS execution_lock TIMESTAMP WITH TIME ZONE;

-- Commentaire
COMMENT ON COLUMN automations.execution_lock IS 
  'Verrou temporaire pour éviter les exécutions multiples simultanées. NULL = pas de verrou, timestamp = verrou actif jusqu''à cette date';

-- =====================================================
-- 4. FONCTION POUR VÉRIFIER ET POSER UN VERROU
-- =====================================================

CREATE OR REPLACE FUNCTION try_lock_automation_execution(
  p_automation_id UUID,
  p_lock_duration_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock TIMESTAMP WITH TIME ZONE;
  v_new_lock TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Récupérer le verrou actuel
  SELECT execution_lock INTO v_current_lock
  FROM automations
  WHERE id = p_automation_id;
  
  -- Si un verrou existe et n'est pas expiré, retourner false
  IF v_current_lock IS NOT NULL AND v_current_lock > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Poser un nouveau verrou
  v_new_lock := NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL;
  
  UPDATE automations
  SET execution_lock = v_new_lock
  WHERE id = p_automation_id
    AND (execution_lock IS NULL OR execution_lock <= NOW());
  
  -- Vérifier si la mise à jour a réussi (verrou posé)
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION try_lock_automation_execution IS 
  'Tente de poser un verrou sur une automatisation pour éviter les exécutions multiples. Retourne TRUE si le verrou a été posé, FALSE sinon.';

-- =====================================================
-- 5. FONCTION POUR LIBÉRER LE VERROU
-- =====================================================

CREATE OR REPLACE FUNCTION release_automation_lock(p_automation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE automations
  SET execution_lock = NULL
  WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_automation_lock IS 
  'Libère le verrou d''exécution d''une automatisation.';

-- =====================================================
-- 6. NETTOYER LES VIEUX VERRous (exécuter périodiquement)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_automation_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Libérer les verrous expirés (plus de 10 minutes)
  UPDATE automations
  SET execution_lock = NULL
  WHERE execution_lock IS NOT NULL
    AND execution_lock < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_automation_locks IS 
  'Nettoie les verrous d''exécution expirés. À exécuter périodiquement via pg_cron.';

-- =====================================================
-- 7. CRON JOB POUR NETTOYER LES VERRous
-- =====================================================

-- Supprimer le cron job s'il existe déjà
SELECT cron.unschedule('automation-cleanup-locks') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'automation-cleanup-locks'
);

-- Programmer le nettoyage toutes les heures
SELECT cron.schedule(
  'automation-cleanup-locks',
  '0 * * * *', -- Toutes les heures
  'SELECT cleanup_expired_automation_locks();'
);

-- =====================================================
-- 8. AMÉLIORER LA LOGIQUE DU SCHEDULER
-- =====================================================

-- Note: Les modifications du scheduler seront faites dans automation-scheduler/index.ts
-- pour utiliser try_lock_automation_execution() avant d'exécuter une automatisation

COMMENT ON TABLE automations IS 
  'Table des automatisations avec protection contre les exécutions multiples via execution_lock';

