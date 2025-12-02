-- ============================================================================
-- FIX: Corriger les policies RLS pour permettre au webhook Stripe de fonctionner
-- ============================================================================
-- Le webhook Stripe utilise SUPABASE_SERVICE_ROLE_KEY et doit pouvoir accéder
-- aux tables même avec RLS activé
-- ============================================================================

-- ============================================================================
-- 1. CORRIGER: stripe_price_mapping - Autoriser le service role
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_price_mapping'
  ) THEN
    -- Supprimer l'ancienne policy restrictive
    DROP POLICY IF EXISTS "stripe_price_mapping_select" ON public.stripe_price_mapping;
    
    -- Créer une nouvelle policy qui permet au service role ET aux utilisateurs authentifiés
    CREATE POLICY "stripe_price_mapping_select" ON public.stripe_price_mapping
      FOR SELECT
      USING (
        auth.jwt() ->> 'role' = 'service_role'  -- Service role (pour webhooks)
        OR auth.role() = 'authenticated'        -- Utilisateurs authentifiés
      );
    
    RAISE NOTICE '✅ Policy stripe_price_mapping corrigée pour permettre le service role';
  END IF;
END $$;

-- ============================================================================
-- 2. VÉRIFIER: Autres tables utilisées par le webhook
-- ============================================================================
-- Le webhook utilise aussi:
-- - stripe_customers
-- - stripe_subscriptions
-- - stripe_orders
-- - user_subscriptions
-- - subscription_plans
-- 
-- Vérifions que ces tables permettent au service role d'accéder
-- ============================================================================

-- Vérifier les policies existantes
SELECT 
  schemaname || '.' || tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'stripe_customers',
    'stripe_subscriptions',
    'stripe_orders',
    'user_subscriptions',
    'subscription_plans',
    'stripe_price_mapping'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. CRÉER DES POLICIES POUR LE SERVICE ROLE SI NÉCESSAIRE
-- ============================================================================

-- stripe_customers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_customers'
  ) THEN
    -- Vérifier si RLS est activé
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'stripe_customers' 
      AND rowsecurity = true
    ) THEN
      -- Créer une policy pour le service role si elle n'existe pas
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stripe_customers'
        AND policyname = 'stripe_customers_service_role'
      ) THEN
        CREATE POLICY "stripe_customers_service_role" ON public.stripe_customers
          FOR ALL
          USING (auth.jwt() ->> 'role' = 'service_role')
          WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
        
        RAISE NOTICE '✅ Policy créée pour stripe_customers (service role)';
      END IF;
    END IF;
  END IF;
END $$;

-- stripe_subscriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_subscriptions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'stripe_subscriptions' 
      AND rowsecurity = true
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stripe_subscriptions'
        AND policyname = 'stripe_subscriptions_service_role'
      ) THEN
        CREATE POLICY "stripe_subscriptions_service_role" ON public.stripe_subscriptions
          FOR ALL
          USING (auth.jwt() ->> 'role' = 'service_role')
          WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
        
        RAISE NOTICE '✅ Policy créée pour stripe_subscriptions (service role)';
      END IF;
    END IF;
  END IF;
END $$;

-- stripe_orders
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stripe_orders'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'stripe_orders' 
      AND rowsecurity = true
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'stripe_orders'
        AND policyname = 'stripe_orders_service_role'
      ) THEN
        CREATE POLICY "stripe_orders_service_role" ON public.stripe_orders
          FOR ALL
          USING (auth.jwt() ->> 'role' = 'service_role')
          WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
        
        RAISE NOTICE '✅ Policy créée pour stripe_orders (service role)';
      END IF;
    END IF;
  END IF;
END $$;

-- user_subscriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_subscriptions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'user_subscriptions' 
      AND rowsecurity = true
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_subscriptions'
        AND policyname = 'user_subscriptions_service_role'
      ) THEN
        CREATE POLICY "user_subscriptions_service_role" ON public.user_subscriptions
          FOR ALL
          USING (auth.jwt() ->> 'role' = 'service_role')
          WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
        
        RAISE NOTICE '✅ Policy créée pour user_subscriptions (service role)';
      END IF;
    END IF;
  END IF;
END $$;

-- subscription_plans
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscription_plans'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'subscription_plans' 
      AND rowsecurity = true
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'subscription_plans'
        AND policyname = 'subscription_plans_service_role'
      ) THEN
        CREATE POLICY "subscription_plans_service_role" ON public.subscription_plans
          FOR ALL
          USING (auth.jwt() ->> 'role' = 'service_role')
          WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
        
        RAISE NOTICE '✅ Policy créée pour subscription_plans (service role)';
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================

SELECT 
  'Vérification Policies Service Role' AS check_type,
  schemaname || '.' || tablename AS table_name,
  COUNT(*) AS policies_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Policies existantes'
    ELSE '⚠️ Aucune policy pour service role'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'stripe_customers',
    'stripe_subscriptions',
    'stripe_orders',
    'user_subscriptions',
    'subscription_plans',
    'stripe_price_mapping'
  )
  AND (
    qual::text LIKE '%service_role%'
    OR with_check::text LIKE '%service_role%'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez ce script dans Supabase Dashboard > SQL Editor
-- 2. Vérifiez les messages NOTICE pour voir ce qui a été corrigé
-- 3. Testez le webhook Stripe (ou attendez que Stripe réessaie)
-- 4. Vérifiez les logs de l'Edge Function stripe-webhook pour confirmer
-- ============================================================================

