-- Migration V2 pour corriger les exécutions multiples d'automatisations
-- Date: 2025-12-01
-- Problème: Les automations s'exécutent toujours 3 fois malgré la première migration
-- Solution: Protection supplémentaire + vérification des doublons améliorée

-- =====================================================
-- 1. VÉRIFIER ET SUPPRIMER LES DOUBLONS (AMÉLIORÉ)
-- =====================================================

-- Afficher tous les doublons avant suppression
DO $$
DECLARE
  dup_record RECORD;
  total_duplicates INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Recherche des doublons d''automatisations...';
  
  FOR dup_record IN
    SELECT 
      user_id, 
      name, 
      COUNT(*) as count, 
      array_agg(id ORDER BY created_at) as ids,
      array_agg(created_at ORDER BY created_at) as created_dates
    FROM automations
    WHERE is_active = true
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  LOOP
    total_duplicates := total_duplicates + 1;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📋 Doublon #% trouvé:', total_duplicates;
    RAISE NOTICE '   User ID: %', dup_record.user_id;
    RAISE NOTICE '   Nom: %', dup_record.name;
    RAISE NOTICE '   Nombre: %', dup_record.count;
    RAISE NOTICE '   IDs: %', dup_record.ids;
    RAISE NOTICE '   Dates de création: %', dup_record.created_dates;
    
    -- Garder le plus récent (dernier dans l'array), supprimer les autres
    DELETE FROM automations
    WHERE user_id = dup_record.user_id
      AND name = dup_record.name
      AND id != dup_record.ids[array_length(dup_record.ids, 1)]; -- Garder le dernier (plus récent)
    
    GET DIAGNOSTICS total_duplicates = ROW_COUNT;
    RAISE NOTICE '   ✅ % doublon(s) supprimé(s)', total_duplicates;
  END LOOP;
  
  IF total_duplicates = 0 THEN
    RAISE NOTICE '✅ Aucun doublon trouvé';
  ELSE
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Total: % groupe(s) de doublons supprimé(s)', total_duplicates;
  END IF;
END $$;

-- =====================================================
-- 2. CRÉER/VERIFIER L'INDEX UNIQUE
-- =====================================================

-- Supprimer l'index s'il existe déjà
DROP INDEX IF EXISTS idx_automations_user_name_unique;

-- Créer un index unique pour éviter les doublons futurs
CREATE UNIQUE INDEX IF NOT EXISTS idx_automations_user_name_unique 
ON automations(user_id, name) 
WHERE is_active = true;

COMMENT ON INDEX idx_automations_user_name_unique IS 
  'Index unique pour empêcher les doublons d''automatisations actives par utilisateur';

-- =====================================================
-- 3. AJOUTER/MODIFIER LA COLONNE DE VERROU
-- =====================================================

-- Ajouter la colonne si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'automations' 
    AND column_name = 'execution_lock'
  ) THEN
    ALTER TABLE automations 
    ADD COLUMN execution_lock TIMESTAMP WITH TIME ZONE;
    
    RAISE NOTICE '✅ Colonne execution_lock ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️ Colonne execution_lock existe déjà';
  END IF;
END $$;

COMMENT ON COLUMN automations.execution_lock IS 
  'Verrou temporaire pour éviter les exécutions multiples simultanées. NULL = pas de verrou, timestamp = verrou actif jusqu''à cette date';

-- =====================================================
-- 4. CRÉER/MODIFIER LES FONCTIONS DE VERROU
-- =====================================================

-- Fonction pour poser un verrou
CREATE OR REPLACE FUNCTION try_lock_automation_execution(
  p_automation_id UUID,
  p_lock_duration_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lock TIMESTAMP WITH TIME ZONE;
  v_new_lock TIMESTAMP WITH TIME ZONE;
  v_rows_updated INTEGER;
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
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  -- Vérifier si la mise à jour a réussi (verrou posé)
  RETURN v_rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION try_lock_automation_execution IS 
  'Tente de poser un verrou sur une automatisation pour éviter les exécutions multiples. Retourne TRUE si le verrou a été posé, FALSE sinon.';

-- Fonction pour libérer le verrou
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

-- Fonction pour nettoyer les verrous expirés
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
-- 5. CRON JOB POUR NETTOYER LES VERRous
-- =====================================================

-- Supprimer le cron job s'il existe déjà
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-cleanup-locks') THEN
    PERFORM cron.unschedule('automation-cleanup-locks');
    RAISE NOTICE '✅ Cron job automation-cleanup-locks supprimé (sera recréé)';
  END IF;
END $$;

-- Programmer le nettoyage toutes les heures
SELECT cron.schedule(
  'automation-cleanup-locks',
  '0 * * * *', -- Toutes les heures
  'SELECT cleanup_expired_automation_locks();'
);

-- =====================================================
-- 6. NETTOYER LES VERRous EXISTANTS (au cas où)
-- =====================================================

-- Libérer tous les verrous expirés maintenant
DO $$
DECLARE
  v_cleaned INTEGER;
BEGIN
  SELECT cleanup_expired_automation_locks() INTO v_cleaned;
  RAISE NOTICE '🧹 % verrou(s) expiré(s) nettoyé(s)', v_cleaned;
END $$;

-- =====================================================
-- 7. RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Migration terminée avec succès !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Actions effectuées:';
  RAISE NOTICE '   1. ✅ Doublons d''automatisations supprimés';
  RAISE NOTICE '   2. ✅ Index unique créé pour éviter les doublons futurs';
  RAISE NOTICE '   3. ✅ Colonne execution_lock ajoutée/vérifiée';
  RAISE NOTICE '   4. ✅ Fonctions de verrou créées/mises à jour';
  RAISE NOTICE '   5. ✅ Cron job de nettoyage programmé';
  RAISE NOTICE '   6. ✅ Verrous expirés nettoyés';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour vérifier les doublons:';
  RAISE NOTICE '   SELECT user_id, name, COUNT(*) FROM automations WHERE is_active = true GROUP BY user_id, name HAVING COUNT(*) > 1;';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour voir les verrous actifs:';
  RAISE NOTICE '   SELECT id, name, execution_lock FROM automations WHERE execution_lock IS NOT NULL AND execution_lock > NOW();';
  RAISE NOTICE '';
END $$;

