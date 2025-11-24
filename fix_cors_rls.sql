-- =====================================================
-- FIX CORS & RLS - Corriger les politiques d'accès
-- =====================================================

-- 1. Vérifier que RLS est activé sur toutes les tables
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour automations (lecture/écriture pour l'utilisateur propriétaire)
DROP POLICY IF EXISTS "Users can view their own automations" ON automations;
CREATE POLICY "Users can view their own automations"
  ON automations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own automations" ON automations;
CREATE POLICY "Users can insert their own automations"
  ON automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own automations" ON automations;
CREATE POLICY "Users can update their own automations"
  ON automations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own automations" ON automations;
CREATE POLICY "Users can delete their own automations"
  ON automations FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Politiques pour notifications (lecture/écriture pour l'utilisateur propriétaire)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role peut insérer des notifications pour n'importe quel utilisateur
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 4. Politiques pour profiles (lecture/écriture pour l'utilisateur propriétaire)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Politiques pour user_settings (lecture/écriture pour l'utilisateur propriétaire)
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Vérifier les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'N/A'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'N/A'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('automations', 'notifications', 'profiles', 'user_settings')
ORDER BY tablename, policyname;
