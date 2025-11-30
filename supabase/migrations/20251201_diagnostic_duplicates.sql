-- Script de diagnostic pour identifier les doublons d'automatisations
-- À exécuter AVANT la migration de correction

-- =====================================================
-- 1. VÉRIFIER LES DOUBLONS PAR USER_ID ET NAME
-- =====================================================

SELECT 
  '📋 DOUBLONS PAR USER_ID + NAME' as diagnostic,
  user_id,
  name,
  COUNT(*) as count,
  array_agg(id ORDER BY created_at) as automation_ids,
  array_agg(created_at ORDER BY created_at) as created_dates,
  array_agg(is_active ORDER BY created_at) as active_statuses
FROM automations
WHERE is_active = true
GROUP BY user_id, name
HAVING COUNT(*) > 1
ORDER BY count DESC, user_id, name;

-- =====================================================
-- 2. VÉRIFIER LES AUTOMATIONS ACTIVES PAR UTILISATEUR
-- =====================================================

SELECT 
  '👤 AUTOMATIONS ACTIVES PAR UTILISATEUR' as diagnostic,
  user_id,
  COUNT(*) as total_automations,
  COUNT(DISTINCT name) as unique_names,
  array_agg(DISTINCT name ORDER BY name) as automation_names
FROM automations
WHERE is_active = true
GROUP BY user_id
ORDER BY total_automations DESC;

-- =====================================================
-- 3. VÉRIFIER LES AUTOMATIONS SPÉCIFIQUES (weekly-summary, daily_quote, monthly-report)
-- =====================================================

SELECT 
  '🔍 AUTOMATIONS SPÉCIFIQUES' as diagnostic,
  user_id,
  name,
  id,
  is_active,
  user_local_time,
  user_timezone,
  last_executed_at,
  next_execution_at,
  execution_lock,
  created_at
FROM automations
WHERE is_active = true
  AND name IN ('weekly-summary', 'daily_quote', 'monthly-report')
ORDER BY user_id, name, created_at;

-- =====================================================
-- 4. VÉRIFIER LES VERRous ACTIFS
-- =====================================================

SELECT 
  '🔒 VERRous ACTIFS' as diagnostic,
  id,
  user_id,
  name,
  execution_lock,
  last_executed_at,
  CASE 
    WHEN execution_lock IS NULL THEN 'Pas de verrou'
    WHEN execution_lock > NOW() THEN 'Verrou actif'
    ELSE 'Verrou expiré'
  END as lock_status
FROM automations
WHERE execution_lock IS NOT NULL
ORDER BY execution_lock DESC;

-- =====================================================
-- 5. VÉRIFIER LES DERNIÈRES EXÉCUTIONS (si automation_executions existe)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_executions') THEN
    RAISE NOTICE '📊 Dernières exécutions (24h):';
  ELSE
    RAISE NOTICE 'ℹ️ Table automation_executions n''existe pas';
  END IF;
END $$;

SELECT 
  '📊 DERNIÈRES EXÉCUTIONS' as diagnostic,
  a.id as automation_id,
  a.name as automation_name,
  a.user_id,
  COUNT(ae.id) as execution_count,
  MAX(ae.started_at) as last_execution,
  array_agg(ae.started_at ORDER BY ae.started_at DESC) FILTER (WHERE ae.started_at > NOW() - INTERVAL '24 hours') as recent_executions
FROM automations a
LEFT JOIN automation_executions ae ON ae.automation_id = a.id
WHERE a.is_active = true
  AND a.name IN ('weekly-summary', 'daily_quote', 'monthly-report')
  AND (ae.started_at IS NULL OR ae.started_at > NOW() - INTERVAL '24 hours')
GROUP BY a.id, a.name, a.user_id
ORDER BY execution_count DESC, a.user_id, a.name;

-- =====================================================
-- 6. RÉSUMÉ
-- =====================================================

DO $$
DECLARE
  v_duplicates INTEGER;
  v_total_active INTEGER;
  v_locked INTEGER;
BEGIN
  -- Compter les doublons
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT user_id, name, COUNT(*) as count
    FROM automations
    WHERE is_active = true
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) dup;
  
  -- Compter les automations actives
  SELECT COUNT(*) INTO v_total_active
  FROM automations
  WHERE is_active = true;
  
  -- Compter les verrous actifs
  SELECT COUNT(*) INTO v_locked
  FROM automations
  WHERE execution_lock IS NOT NULL
    AND execution_lock > NOW();
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RÉSUMÉ DU DIAGNOSTIC';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '   Total automations actives: %', v_total_active;
  RAISE NOTICE '   Groupes de doublons: %', v_duplicates;
  RAISE NOTICE '   Verrous actifs: %', v_locked;
  RAISE NOTICE '';
  
  IF v_duplicates > 0 THEN
    RAISE NOTICE '   ⚠️  DOUBLONS DÉTECTÉS ! Exécutez la migration de correction.';
  ELSE
    RAISE NOTICE '   ✅ Aucun doublon détecté';
  END IF;
  
  RAISE NOTICE '';
END $$;

