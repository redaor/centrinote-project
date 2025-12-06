-- Migration: Correction des politiques RLS pour support_messages
-- Utilise uniquement le JWT token (pas d'accès aux tables auth.users ou profiles)

-- Supprimer l'ancienne politique SELECT si elle existe
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;

-- Créer une nouvelle politique SELECT simple utilisant uniquement le JWT
CREATE POLICY "Admins can view all support messages"
  ON support_messages
  FOR SELECT
  USING (
    -- Vérifier via JWT email (méthode la plus simple et fiable)
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

-- Supprimer et recréer la politique UPDATE pour être cohérente
DROP POLICY IF EXISTS "Admins can update support messages" ON support_messages;

CREATE POLICY "Admins can update support messages"
  ON support_messages
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

