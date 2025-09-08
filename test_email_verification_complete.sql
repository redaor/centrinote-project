-- ==========================================
-- TESTS COMPLETS POUR LA VÉRIFICATION EMAIL
-- ==========================================

-- 1. Tester la fonction principale
SELECT 
  'Test fonction principale' as test,
  public.user_email_verified() as result;

-- 2. Debug complet de l'utilisateur
SELECT 
  'Debug utilisateur' as test,
  public.debug_user_verification() as result;

-- 3. Vérification des métadonnées directement
SELECT 
  'Métadonnées directes' as test,
  jsonb_build_object(
    'user_id', auth.uid(),
    'raw_metadata', raw_user_meta_data,
    'email_verified', raw_user_meta_data ->> 'email_verified',
    'verification_pending', raw_user_meta_data ->> 'verification_pending'
  ) as result
FROM auth.users 
WHERE id = auth.uid();

-- ==========================================
-- TESTS D'ACCÈS AUX TABLES (à exécuter successivement)
-- ==========================================

-- Test 1: Accès à profiles (devrait échouer si non vérifié)
SELECT 
  'Test accès profiles' as test,
  COUNT(*) as result
FROM profiles 
WHERE id = auth.uid();

-- Test 2: Tentative d'insertion (devrait échouer si non vérifié)
-- Remplace les valeurs par de vraies données
/*
INSERT INTO profiles (id, email, name) 
VALUES (
  auth.uid(), 
  'test@example.com', 
  'Test User'
) 
ON CONFLICT (id) DO NOTHING;
*/

-- ==========================================
-- SIMULATION D'ÉTATS POUR TESTS
-- (à exécuter en tant qu'admin ou service_role)
-- ==========================================

-- Simuler utilisateur non vérifié
/*
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
  'email_verified', false,
  'verification_pending', true,
  'signup_time', NOW()::text,
  'verification_method', 'n8n_code'
)
WHERE id = auth.uid();
*/

-- Simuler utilisateur vérifié
/*
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
  'email_verified', true,
  'verification_pending', false,
  'email_verified_at', NOW()::text,
  'verification_method', 'n8n_code'
)
WHERE id = auth.uid();
*/

-- ==========================================
-- VÉRIFICATIONS ADMIN
-- ==========================================

-- Vue d'ensemble des utilisateurs et leur statut
SELECT 
  id,
  email,
  raw_user_meta_data ->> 'email_verified' as email_verified,
  raw_user_meta_data ->> 'verification_pending' as verification_pending,
  raw_user_meta_data ->> 'email_verified_at' as verified_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques de vérification
SELECT 
  CASE 
    WHEN raw_user_meta_data ->> 'email_verified' = 'true' 
         AND COALESCE(raw_user_meta_data ->> 'verification_pending', 'false') = 'false' 
         THEN 'Vérifié'
    WHEN raw_user_meta_data ->> 'verification_pending' = 'true' 
         THEN 'En attente'
    ELSE 'Non vérifié'
  END as statut,
  COUNT(*) as nombre
FROM auth.users
GROUP BY 1;

-- ==========================================
-- VÉRIFICATION DES POLITIQUES RLS
-- ==========================================

-- Lister les politiques actives
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'notes', 'documents', 'vocabulary')
   OR policyname ILIKE '%verified%'
ORDER BY tablename, policyname;

-- Test de la fonction dans une politique (simulation)
SELECT 
  'Test fonction dans politique' as test,
  CASE 
    WHEN public.user_email_verified() THEN 'ACCÈS AUTORISÉ'
    ELSE 'ACCÈS REFUSÉ'
  END as result;