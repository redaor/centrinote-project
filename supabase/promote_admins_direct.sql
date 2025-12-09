-- ==========================================
-- PROMOTION DIRECTE EN ADMINISTRATEURS
-- ==========================================
-- Script à exécuter directement dans l'éditeur SQL de Supabase
-- pour promouvoir les deux utilisateurs en administrateurs

-- ÉTAPE 1: Vérifier que les utilisateurs existent
SELECT 
  id,
  email,
  name,
  role,
  subscription
FROM profiles
WHERE LOWER(email) IN (
  LOWER('reda_sahraoui@outlook.fr'), 
  LOWER('contact@centrinote.fr')
);

-- ÉTAPE 2: Créer la fonction de promotion (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
  normalized_email text;
BEGIN
  normalized_email := LOWER(TRIM(user_email));
  
  UPDATE profiles 
  SET role = 'admin', updated_at = now()
  WHERE LOWER(TRIM(email)) = normalized_email;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Utilisateur % promu en administrateur', normalized_email;
    RETURN true;
  ELSE
    RAISE WARNING '⚠️ Aucun utilisateur trouvé avec l''email: %', normalized_email;
    RETURN false;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erreur: %', SQLERRM;
    RETURN false;
END;
$$;

-- ÉTAPE 3: Promouvoir les deux utilisateurs
SELECT promote_user_to_admin('reda_sahraoui@outlook.fr') as result1;
SELECT promote_user_to_admin('contact@centrinote.fr') as result2;

-- ÉTAPE 4: Si les utilisateurs n'existent pas dans profiles, les créer depuis auth.users
-- (nécessite que les utilisateurs soient déjà inscrits dans auth.users)
INSERT INTO profiles (id, email, name, role, subscription)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  'admin' as role,
  'free' as subscription
FROM auth.users au
WHERE LOWER(au.email) IN (
  LOWER('reda_sahraoui@outlook.fr'), 
  LOWER('contact@centrinote.fr')
)
AND NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'admin',
  updated_at = now();

-- ÉTAPE 5: Vérification finale
SELECT 
  id,
  email,
  name,
  role,
  subscription,
  created_at,
  updated_at
FROM profiles
WHERE LOWER(email) IN (
  LOWER('reda_sahraoui@outlook.fr'), 
  LOWER('contact@centrinote.fr')
)
ORDER BY email;

