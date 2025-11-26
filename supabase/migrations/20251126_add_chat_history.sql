-- Migration: Ajouter système de persistance de l'historique conversationnel
-- Date: 2025-11-26
-- Description: Permet de sauvegarder et récupérer les conversations entre l'utilisateur et l'IA

-- Table pour stocker l'historique des conversations
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour optimiser la récupération de l'historique par session
CREATE INDEX idx_chat_history_session ON chat_history(session_id, created_at DESC);

-- Index pour optimiser la récupération par utilisateur
CREATE INDEX idx_chat_history_user ON chat_history(user_id, created_at DESC);

-- RLS (Row Level Security) pour sécuriser l'accès
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Politique: L'utilisateur peut lire ses propres messages
CREATE POLICY "Users can read their own chat history"
  ON chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: L'utilisateur peut insérer ses propres messages
CREATE POLICY "Users can insert their own chat history"
  ON chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Service role peut tout faire (pour l'Edge Function)
CREATE POLICY "Service role has full access"
  ON chat_history
  FOR ALL
  USING (auth.role() = 'service_role');

-- Fonction pour nettoyer l'historique ancien (optionnel, garde 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_chat_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM chat_history
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Commentaire sur la table
COMMENT ON TABLE chat_history IS 'Stocke l''historique des conversations entre utilisateurs et IA';
COMMENT ON COLUMN chat_history.session_id IS 'Identifiant unique de la session de conversation';
COMMENT ON COLUMN chat_history.role IS 'Rôle du message: user ou assistant';
COMMENT ON COLUMN chat_history.content IS 'Contenu du message';
