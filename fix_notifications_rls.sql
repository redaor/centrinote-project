-- =====================================================
-- CORRECTION DES POLITIQUES RLS POUR notifications
-- =====================================================

-- 1. Activer RLS sur la table notifications (si pas déjà fait)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 3. Politique pour que les utilisateurs voient uniquement leurs notifications
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Politique pour que les utilisateurs puissent marquer leurs notifications comme lues
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Politique pour que le système (service role) puisse insérer des notifications
-- Note: Cette politique permet aux Edge Functions d'insérer des notifications
CREATE POLICY "System can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- 6. Vérifier les politiques créées
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
WHERE tablename = 'notifications'
ORDER BY policyname;

