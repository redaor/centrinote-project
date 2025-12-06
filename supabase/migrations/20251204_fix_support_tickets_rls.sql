-- Migration: Correction des politiques RLS pour support_messages
-- Améliore la détection des admins pour permettre la lecture des messages

-- Supprimer l'ancienne politique SELECT si elle existe
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;

-- Créer une nouvelle politique SELECT plus robuste
CREATE POLICY "Admins can view all support messages"
  ON support_messages
  FOR SELECT
  USING (
    -- Vérifier via JWT email
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr') OR
    -- Vérifier via auth.users (plus fiable)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
    ) OR
    -- Vérifier via profiles si la table existe
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.email IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
        OR profiles.role = 'admin'
      )
    )
  );

