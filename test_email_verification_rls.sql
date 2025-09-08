-- ==========================================
-- TESTS POUR VÉRIFIER LES RÈGLES RLS EMAIL
-- ==========================================

-- 1. Tester la fonction auth.user_email_verified()
SELECT auth.user_email_verified() as email_verified;

-- 2. Vérifier les métadonnées de l'utilisateur actuel
SELECT 
  auth.uid() as user_id,
  (auth.jwt() ->> 'user_metadata')::jsonb as user_metadata,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'email_verified' as email_verified,
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'verification_pending' as verification_pending;

-- 3. Test d'accès à la table profiles (devrait échouer si email non vérifié)
SELECT * FROM profiles WHERE id = auth.uid();

-- 4. Test d'insertion dans profiles (devrait échouer si email non vérifié)
INSERT INTO profiles (id, email, name) 
VALUES (auth.uid(), 'test@example.com', 'Test User');

-- 5. Test d'accès aux notes (devrait échouer si email non vérifié)
SELECT * FROM notes WHERE user_id = auth.uid();

-- 6. Test d'insertion de note (devrait échouer si email non vérifié)
INSERT INTO notes (user_id, title, content) 
VALUES (auth.uid(), 'Test Note', 'Contenu de test');

-- ==========================================
-- TESTS POUR SIMULER DIFFÉRENTS ÉTATS
-- ==========================================

-- Simuler un utilisateur non vérifié (à exécuter en tant qu'admin)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
  'email_verified', false,
  'verification_pending', true
)
WHERE id = 'USER_ID_HERE';

-- Simuler un utilisateur vérifié (à exécuter en tant qu'admin)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
  'email_verified', true,
  'verification_pending', false,
  'email_verified_at', NOW()::text
)
WHERE id = 'USER_ID_HERE';

-- ==========================================
-- VÉRIFICATIONS ADMINISTRATEUR
-- ==========================================

-- Lister tous les utilisateurs et leur statut de vérification
SELECT 
  id,
  email,
  raw_user_meta_data ->> 'email_verified' as email_verified,
  raw_user_meta_data ->> 'verification_pending' as verification_pending,
  raw_user_meta_data ->> 'email_verified_at' as verified_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Compter les utilisateurs par statut
SELECT 
  CASE 
    WHEN raw_user_meta_data ->> 'email_verified' = 'true' THEN 'verified'
    WHEN raw_user_meta_data ->> 'verification_pending' = 'true' THEN 'pending'
    ELSE 'not_started'
  END as status,
  COUNT(*) as count
FROM auth.users
GROUP BY 1;

-- ==========================================
-- DEBUG : VÉRIFIER LES POLITIQUES ACTIVES
-- ==========================================

-- Lister toutes les politiques RLS sur les tables importantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'notes', 'documents', 'vocabulary')
ORDER BY tablename, policyname;