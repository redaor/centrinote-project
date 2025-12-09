-- ==========================================
-- PROMOTION D'UTILISATEURS EN ADMINISTRATEURS
-- ==========================================
-- Ce script promeut des utilisateurs spécifiques en administrateurs
-- en contournant les restrictions RLS

-- Fonction pour promouvoir un utilisateur en admin par email
-- Utilise SECURITY DEFINER pour contourner les restrictions RLS
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
  -- Normaliser l'email (minuscules, trim)
  normalized_email := LOWER(TRIM(user_email));
  
  -- Mettre à jour le rôle en admin (bypass RLS grâce à SECURITY DEFINER)
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
    RAISE WARNING '❌ Erreur lors de la promotion: %', SQLERRM;
    RETURN false;
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION promote_user_to_admin(text) TO service_role;
GRANT EXECUTE ON FUNCTION promote_user_to_admin(text) TO authenticated;

-- Promouvoir les deux utilisateurs spécifiques
DO $$
DECLARE
  result1 boolean;
  result2 boolean;
BEGIN
  RAISE NOTICE '🔄 Promotion des administrateurs...';
  
  result1 := promote_user_to_admin('reda_sahraoui@outlook.fr');
  result2 := promote_user_to_admin('contact@centrinote.fr');
  
  IF result1 AND result2 THEN
    RAISE NOTICE '✅ Les deux utilisateurs ont été promus en administrateurs';
  ELSIF result1 THEN
    RAISE WARNING '⚠️ Seul reda_sahraoui@outlook.fr a été promu';
  ELSIF result2 THEN
    RAISE WARNING '⚠️ Seul contact@centrinote.fr a été promu';
  ELSE
    RAISE WARNING '❌ Aucun utilisateur n''a été promu';
  END IF;
END $$;

-- Vérifier que les utilisateurs ont bien été promus
SELECT 
  id,
  email,
  name,
  role,
  subscription,
  created_at,
  updated_at
FROM profiles
WHERE email IN ('reda_sahraoui@outlook.fr', 'contact@centrinote.fr')
ORDER BY email;

