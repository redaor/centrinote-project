-- Migration: Correction des politiques RLS pour support_tickets
-- Permet aux admins de voir tous les tickets

-- Supprimer l'ancienne politique admin si elle existe
DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;

-- Créer une nouvelle politique admin plus simple et efficace
CREATE POLICY "Admins can manage all tickets"
  ON support_tickets
  FOR ALL
  USING (
    -- Vérifier si l'utilisateur connecté est admin
    auth.jwt() ->> 'email' = 'contact@centrinote.fr' OR
    auth.jwt() ->> 'email' = 'reda_sahraoui@outlook.fr' OR
    -- Vérifier aussi via la table auth.users
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'contact@centrinote.fr' OR 
        auth.users.email = 'reda_sahraoui@outlook.fr'
      )
    )
  )
  WITH CHECK (
    -- Même condition pour INSERT/UPDATE
    auth.jwt() ->> 'email' = 'contact@centrinote.fr' OR
    auth.jwt() ->> 'email' = 'reda_sahraoui@outlook.fr' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'contact@centrinote.fr' OR 
        auth.users.email = 'reda_sahraoui@outlook.fr'
      )
    )
  );

-- Ajouter une politique pour permettre la lecture de tous les tickets aux admins (séparée pour plus de clarté)
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'contact@centrinote.fr' OR
    auth.jwt() ->> 'email' = 'reda_sahraoui@outlook.fr' OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.email = 'contact@centrinote.fr' OR 
        auth.users.email = 'reda_sahraoui@outlook.fr'
      )
    )
  );

