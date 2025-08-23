/*
  # Création de la fonction uid()
  
  1. Fonction
    - Crée une fonction `uid()` qui retourne l'ID de l'utilisateur actuellement authentifié
    - Utilisée dans les policies RLS pour sécuriser l'accès aux données
  
  2. Sécurité
    - Fonction définie avec SECURITY DEFINER pour s'exécuter avec les privilèges du créateur
*/

-- Fonction pour obtenir l'ID de l'utilisateur authentifié
CREATE OR REPLACE FUNCTION public.uid() 
RETURNS uuid 
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid()
$$;

-- Accorder l'exécution à tous les utilisateurs
GRANT EXECUTE ON FUNCTION public.uid() TO public;