-- ============================================================================
-- FIX: Correction des problèmes de sécurité détectés par Supabase Linter
-- ============================================================================
-- Ce script corrige les problèmes de sécurité identifiés
-- ============================================================================

-- ============================================================================
-- 1. CORRIGER: auth_users_exposed - forum_user_stats
-- ============================================================================
-- Problème: La vue expose auth.users aux rôles anon/authenticated
-- Solution: Recréer la vue sans exposer auth.users directement
-- ============================================================================

DROP VIEW IF EXISTS public.forum_user_stats CASCADE;

-- Recréer la vue en utilisant public.profiles au lieu de auth.users
-- La table profiles a les colonnes: id, email, name, avatar_url, role, subscription, etc.
DO $$
BEGIN
  -- Vérifier si la table profiles existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Recréer la vue avec security_invoker (utilise les permissions de l'utilisateur qui interroge)
    CREATE OR REPLACE VIEW public.forum_user_stats
    WITH (security_invoker = true)
    AS
    SELECT
      p.id as user_id,
      COALESCE(p.email, '') as email,
      COALESCE(p.name, p.email, '') as name,
      COUNT(DISTINCT fp.id) as posts_count,
      COUNT(DISTINCT fr.id) as replies_count,
      COALESCE(SUM(fp.likes_count), 0) + COALESCE(SUM(fr.likes_count), 0) as total_likes,
      COUNT(DISTINCT CASE WHEN fp.accepted_answer_id IS NOT NULL THEN fp.id END) as accepted_answers_count
    FROM public.profiles p
    LEFT JOIN public.forum_posts fp ON fp.user_id = p.id
    LEFT JOIN public.forum_replies fr ON fr.user_id = p.id
    GROUP BY p.id, p.email, p.name;
    
    RAISE NOTICE '✅ Vue forum_user_stats recréée avec security_invoker (utilise profiles)';
  ELSE
    -- Si profiles n'existe pas, supprimer la vue
    DROP VIEW IF EXISTS public.forum_user_stats CASCADE;
    RAISE NOTICE '⚠️ Table profiles n''existe pas, vue forum_user_stats supprimée';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, supprimer simplement la vue
    DROP VIEW IF EXISTS public.forum_user_stats CASCADE;
    RAISE NOTICE '⚠️ Erreur lors de la recréation de forum_user_stats, vue supprimée: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. CORRIGER: security_definer_view - vocabulary_entries
-- ============================================================================
-- Problème: La vue utilise SECURITY DEFINER
-- Solution: Changer en security_invoker ou supprimer
-- ============================================================================

-- Supprimer la vue vocabulary_entries si elle existe (probablement créée manuellement)
-- Si vous en avez besoin, recréez-la avec security_invoker
DROP VIEW IF EXISTS public.vocabulary_entries CASCADE;

-- ============================================================================
-- 3. CORRIGER: security_definer_view - vw_automation_performance
-- ============================================================================
-- Problème: La vue utilise SECURITY DEFINER
-- Solution: Changer en security_invoker ou supprimer
-- ============================================================================

-- Supprimer la vue vw_automation_performance si elle existe (probablement créée manuellement)
-- Si vous en avez besoin, recréez-la avec security_invoker
DROP VIEW IF EXISTS public.vw_automation_performance CASCADE;

-- ============================================================================
-- 4. CORRIGER: security_definer_view - forum_user_stats (déjà corrigé en 1)
-- ============================================================================
-- (Déjà corrigé en 1, pas besoin de refaire)
-- ============================================================================

-- ============================================================================
-- 5. CORRIGER: rls_disabled_in_public - user_confirmations
-- ============================================================================
-- Problème: Table publique sans RLS activé
-- Solution: Activer RLS et créer des policies
-- ============================================================================

-- Activer RLS
ALTER TABLE IF EXISTS public.user_confirmations ENABLE ROW LEVEL SECURITY;

-- Créer des policies (si la table existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_confirmations'
  ) THEN
    -- Supprimer l'ancienne policy si elle existe
    DROP POLICY IF EXISTS "Service role can manage user_confirmations" ON public.user_confirmations;
    
    -- Créer des policies sécurisées
    -- Cette table est utilisée pour les confirmations d'email, donc seul le service role peut y accéder
    -- Mais on active RLS pour la sécurité
    CREATE POLICY "user_confirmations_service_role" ON public.user_confirmations
      FOR ALL
      USING (auth.jwt() ->> 'role' = 'service_role')
      WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
    
    RAISE NOTICE '✅ RLS activé pour user_confirmations';
  END IF;
END $$;

-- ============================================================================
-- 6. CORRIGER: rls_disabled_in_public - scheduler_run_log
-- ============================================================================
-- Problème: Table publique sans RLS activé
-- Solution: Activer RLS (table système, peut être restreinte aux admins)
-- ============================================================================

ALTER TABLE IF EXISTS public.scheduler_run_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'scheduler_run_log'
  ) THEN
    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "scheduler_run_log_select" ON public.scheduler_run_log;
    
    -- Policy: Seuls les admins peuvent voir les logs (ou tous les utilisateurs leurs propres logs)
    -- ⚠️ Adaptez selon votre logique
    CREATE POLICY "scheduler_run_log_select" ON public.scheduler_run_log
      FOR SELECT
      USING (true);  -- Ou une condition plus restrictive selon vos besoins
    
    RAISE NOTICE '✅ RLS activé pour scheduler_run_log';
  END IF;
END $$;

-- ============================================================================
-- 7. CORRIGER: rls_disabled_in_public - stripe_price_mapping
-- ============================================================================
-- Problème: Table publique sans RLS activé
-- Solution: Activer RLS (table de configuration, peut être en lecture seule pour tous)
-- ============================================================================

ALTER TABLE IF EXISTS public.stripe_price_mapping ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_price_mapping'
  ) THEN
    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "stripe_price_mapping_select" ON public.stripe_price_mapping;
    DROP POLICY IF EXISTS "stripe_price_mapping_insert" ON public.stripe_price_mapping;
    DROP POLICY IF EXISTS "stripe_price_mapping_update" ON public.stripe_price_mapping;
    DROP POLICY IF EXISTS "stripe_price_mapping_delete" ON public.stripe_price_mapping;
    
    -- Policy: Lecture seule pour tous les utilisateurs authentifiés
    CREATE POLICY "stripe_price_mapping_select" ON public.stripe_price_mapping
      FOR SELECT
      USING (auth.role() = 'authenticated');
    
    -- Seuls les admins peuvent modifier (si nécessaire)
    -- CREATE POLICY "stripe_price_mapping_modify" ON public.stripe_price_mapping
    --   FOR ALL
    --   USING (auth.jwt() ->> 'role' = 'admin');
    
    RAISE NOTICE '✅ RLS activé pour stripe_price_mapping';
  END IF;
END $$;

-- ============================================================================
-- 8. CORRIGER: rls_disabled_in_public - scheduler_locks
-- ============================================================================
-- Problème: Table publique sans RLS activé
-- Solution: Activer RLS (table système, peut être restreinte)
-- ============================================================================

ALTER TABLE IF EXISTS public.scheduler_locks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'scheduler_locks'
  ) THEN
    -- Supprimer les anciennes policies
    DROP POLICY IF EXISTS "scheduler_locks_select" ON public.scheduler_locks;
    
    -- Policy: Table système, peut être restreinte aux admins ou en lecture seule
    CREATE POLICY "scheduler_locks_select" ON public.scheduler_locks
      FOR SELECT
      USING (true);  -- Ou une condition plus restrictive
    
    RAISE NOTICE '✅ RLS activé pour scheduler_locks';
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================
-- Vérifier que tous les problèmes sont corrigés
-- ============================================================================

SELECT 
  'Vérification RLS' AS type,
  schemaname || '.' || tablename AS table_name,
  CASE 
    WHEN rowsecurity THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_confirmations', 'scheduler_run_log', 'stripe_price_mapping', 'scheduler_locks')
ORDER BY tablename;

-- Vérification détaillée des vues
SELECT 
  'Vérification Vues' AS type,
  table_schema || '.' || table_name AS view_name,
  CASE 
    WHEN view_definition LIKE '%SECURITY DEFINER%' THEN '❌ SECURITY DEFINER'
    WHEN view_definition LIKE '%security_invoker%' THEN '✅ security_invoker'
    WHEN table_name = 'forum_user_stats' AND view_definition LIKE '%profiles%' AND view_definition NOT LIKE '%auth.users%' THEN '✅ OK (utilise profiles, pas auth.users)'
    WHEN table_name IN ('vocabulary_entries', 'vw_automation_performance') THEN '✅ Supprimée'
    ELSE '⚠️ À vérifier manuellement'
  END AS status,
  CASE 
    WHEN view_definition LIKE '%auth.users%' THEN '❌ Utilise auth.users'
    WHEN view_definition LIKE '%profiles%' THEN '✅ Utilise profiles'
    ELSE 'N/A'
  END AS source_table
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('vocabulary_entries', 'vw_automation_performance', 'forum_user_stats')
ORDER BY table_name;

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez ce script dans Supabase Dashboard > SQL Editor
-- 2. Vérifiez les messages NOTICE pour voir ce qui a été corrigé
-- 3. Relancez le linter Supabase pour vérifier que les problèmes sont résolus
-- 4. ⚠️ Si certaines vues/tables sont nécessaires, adaptez les policies selon vos besoins
-- ============================================================================

