-- =====================================================
-- Ajouter la politique DELETE pour error_logs
-- =====================================================

-- Supprimer l'ancienne politique qui ne permettait que le service role
DROP POLICY IF EXISTS "Service role can delete error logs" ON error_logs;

-- Permettre aux admins de supprimer tous les logs
CREATE POLICY "Admins can delete all error logs"
ON error_logs
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

-- Permettre aux utilisateurs de supprimer leurs propres logs
CREATE POLICY "Users can delete their own error logs"
ON error_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Garder aussi la politique pour le service role (pour les Edge Functions)
CREATE POLICY "Service role can delete error logs"
ON error_logs
FOR DELETE
USING (auth.jwt() ->> 'role' = 'service_role');
