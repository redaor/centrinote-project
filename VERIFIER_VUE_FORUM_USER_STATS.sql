-- ============================================================================
-- Vérification détaillée de la vue forum_user_stats
-- ============================================================================

-- 1. Vérifier que la vue existe
SELECT 
  'Existence' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'forum_user_stats'
    ) THEN '✅ Vue existe'
    ELSE '❌ Vue n''existe pas'
  END AS status;

-- 2. Vérifier les propriétés de sécurité de la vue
SELECT 
  'Sécurité' AS check_type,
  schemaname || '.' || viewname AS view_name,
  CASE 
    WHEN viewowner = current_user THEN '✅ Propriétaire correct'
    ELSE '⚠️ Propriétaire: ' || viewowner
  END AS owner_status,
  -- Vérifier si security_invoker est défini
  CASE 
    WHEN pg_get_viewdef('public.forum_user_stats'::regclass, true) LIKE '%security_invoker%' 
      OR pg_get_viewdef('public.forum_user_stats'::regclass, true) NOT LIKE '%SECURITY DEFINER%'
    THEN '✅ Utilise security_invoker (ou pas de SECURITY DEFINER)'
    ELSE '❌ Utilise SECURITY DEFINER'
  END AS security_status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname = 'forum_user_stats';

-- 3. Vérifier la définition complète de la vue
SELECT 
  'Définition' AS check_type,
  pg_get_viewdef('public.forum_user_stats'::regclass, true) AS view_definition;

-- 4. Vérifier si la vue utilise auth.users (problème de sécurité)
SELECT 
  'Utilisation auth.users' AS check_type,
  CASE 
    WHEN pg_get_viewdef('public.forum_user_stats'::regclass, true) LIKE '%auth.users%' 
    THEN '❌ Utilise auth.users (problème de sécurité)'
    ELSE '✅ N''utilise pas auth.users'
  END AS status;

-- 5. Vérifier si la vue utilise profiles (bonne pratique)
SELECT 
  'Utilisation profiles' AS check_type,
  CASE 
    WHEN pg_get_viewdef('public.forum_user_stats'::regclass, true) LIKE '%profiles%' 
    THEN '✅ Utilise profiles (bonne pratique)'
    ELSE '⚠️ N''utilise pas profiles'
  END AS status;

-- ============================================================================
-- Résumé
-- ============================================================================
-- Si toutes les vérifications sont ✅, la vue est correcte
-- Relancez ensuite le linter Supabase pour confirmer
-- ============================================================================

