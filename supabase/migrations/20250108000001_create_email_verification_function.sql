-- ==========================================
-- FONCTION DE VÉRIFICATION EMAIL - VERSION CORRIGÉE
-- ==========================================
-- Note: On utilise le schéma public car auth est protégé

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.user_email_verified();

-- Créer la fonction dans le schéma public avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.user_email_verified()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_metadata jsonb;
  email_verified_val text;
  verification_pending_val text;
BEGIN
  -- Récupérer les métadonnées de l'utilisateur actuel
  SELECT raw_user_meta_data 
  INTO current_user_metadata
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Si pas de métadonnées, retourner false
  IF current_user_metadata IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extraire les valeurs
  email_verified_val := current_user_metadata ->> 'email_verified';
  verification_pending_val := COALESCE(current_user_metadata ->> 'verification_pending', 'false');
  
  -- Vérifier les conditions
  RETURN (
    email_verified_val = 'true' 
    AND 
    verification_pending_val = 'false'
  );
END;
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.user_email_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_email_verified() TO anon;

-- Fonction de test pour débugger (optionnelle)
CREATE OR REPLACE FUNCTION public.debug_user_verification()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_metadata jsonb;
  result jsonb;
BEGIN
  -- Récupérer les métadonnées
  SELECT raw_user_meta_data 
  INTO current_user_metadata
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Construire le résultat de debug
  result := jsonb_build_object(
    'user_id', auth.uid(),
    'user_metadata', current_user_metadata,
    'email_verified', current_user_metadata ->> 'email_verified',
    'verification_pending', COALESCE(current_user_metadata ->> 'verification_pending', 'false'),
    'is_verified', public.user_email_verified(),
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- Accorder les permissions pour la fonction de debug
GRANT EXECUTE ON FUNCTION public.debug_user_verification() TO authenticated;