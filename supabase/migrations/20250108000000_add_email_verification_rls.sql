/*
  # Ajouter des règles RLS pour la vérification email

  1. Sécurité basée sur email_verified dans user_metadata
    - Les utilisateurs doivent avoir email_verified = true
    - Les utilisateurs ne doivent pas avoir verification_pending = true
    
  2. Tables protégées
    - `profiles` - profils utilisateur
    - `notes` - notes privées 
    - `documents` - documents uploadés
    - `vocabulary` - vocabulaire personnel
    - Toutes autres tables sensibles

  3. Fonction helper pour vérifier l'état de vérification
*/

-- Note: La fonction user_email_verified() est définie dans une migration séparée
-- car le schéma auth est protégé. Voir 20250108000001_create_email_verification_function.sql

-- Supprimer les anciennes politiques pour profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Nouvelles politiques pour profiles avec vérification email
CREATE POLICY "Verified users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    AND public.user_email_verified()
  );

CREATE POLICY "Verified users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    AND public.user_email_verified()
  )
  WITH CHECK (
    auth.uid() = id 
    AND public.user_email_verified()
  );

CREATE POLICY "Verified users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id 
    AND public.user_email_verified()
  );

-- Si tu as une table notes, ajouter les politiques
CREATE POLICY "Verified users can manage own notes"
  ON notes
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND public.user_email_verified()
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND public.user_email_verified()
  );

-- Si tu as une table documents, ajouter les politiques
CREATE POLICY "Verified users can manage own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND public.user_email_verified()
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND public.user_email_verified()
  );

-- Si tu as une table vocabulary, ajouter les politiques
CREATE POLICY "Verified users can manage own vocabulary"
  ON vocabulary
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND public.user_email_verified()
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND public.user_email_verified()
  );

-- Commenter cette ligne si les tables n'existent pas encore
-- Tu pourras les décommenter quand elles seront créées