-- =====================================================
-- Ajouter la politique DELETE pour support_messages
-- =====================================================

-- Permettre aux admins de supprimer les messages de support
CREATE POLICY "Admins can delete support messages"
ON support_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR profiles.email = 'contact@centrinote.fr'
      OR profiles.email = 'reda_sahraoui@outlook.fr'
    )
  )
);

-- Le service role peut aussi supprimer (pour nettoyage automatique)
CREATE POLICY "Service role can delete support messages"
ON support_messages
FOR DELETE
USING (auth.jwt() ->> 'role' = 'service_role');

