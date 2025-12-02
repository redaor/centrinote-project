-- ============================================================================
-- Système de mémoire de conversation avec pgvector
-- ============================================================================
-- Ce fichier crée les tables nécessaires pour un système de mémoire
-- persistante de conversations avec recherche sémantique via pgvector.
-- ============================================================================

-- Activer l'extension pgvector si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: conversations
-- ============================================================================
-- Stocke les conversations (sessions de chat)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================================================
-- Table: messages
-- ============================================================================
-- Stocke les messages avec leurs embeddings pour la recherche sémantique
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID, -- NULL pour les messages système
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- Dimension pour OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW(),
  token_count INTEGER, -- Estimation du nombre de tokens (optionnel)
  is_summarized BOOLEAN DEFAULT FALSE, -- Indique si le message a été résumé
  
  -- Contraintes
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(conversation_id, role);

-- Index vectoriel pour la recherche sémantique (HNSW pour performance optimale)
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON messages 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE embedding IS NOT NULL;

-- Index partiel pour les messages non résumés (pour la recherche sémantique)
CREATE INDEX IF NOT EXISTS idx_messages_not_summarized ON messages(conversation_id, created_at)
  WHERE is_summarized = FALSE;

-- ============================================================================
-- Table: conversation_summaries
-- ============================================================================
-- Stocke les résumés périodiques des conversations pour réduire la taille
-- du contexte tout en conservant la mémoire à long terme
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER NOT NULL, -- Nombre de messages résumés
  first_message_id UUID, -- Premier message résumé (pour référence)
  last_message_id UUID, -- Dernier message résumé (pour référence)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT fk_summaries_conversation FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON conversation_summaries(conversation_id, created_at DESC);

-- ============================================================================
-- Fonction: Mettre à jour updated_at automatiquement
-- ============================================================================
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON messages;

-- Trigger pour mettre à jour updated_at lors de l'ajout d'un message
CREATE TRIGGER trigger_update_conversation_updated_at
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- ============================================================================
-- Fonction: Recherche sémantique de messages
-- ============================================================================
-- Recherche les K messages les plus pertinents par similarité cosinus
-- Paramètres:
--   p_conversation_id: UUID de la conversation
--   p_query_embedding: VECTOR(1536) - embedding de la requête
--   p_limit: INTEGER - nombre de résultats (défaut: 10)
--   p_exclude_ids: UUID[] - IDs de messages à exclure (ex: derniers messages)
CREATE OR REPLACE FUNCTION search_semantic_messages(
  p_conversation_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 10,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.role,
    m.content,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM messages m
  WHERE 
    m.conversation_id = p_conversation_id
    AND m.embedding IS NOT NULL
    AND m.is_summarized = FALSE
    AND (p_exclude_ids IS NULL OR m.id != ALL(p_exclude_ids))
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Fonction: Obtenir les derniers messages d'une conversation
-- ============================================================================
CREATE OR REPLACE FUNCTION get_recent_messages(
  p_conversation_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.role,
    m.content,
    m.created_at
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour permettre la réexécution)
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;
DROP POLICY IF EXISTS "Users can view own summaries" ON conversation_summaries;
DROP POLICY IF EXISTS "Service role full access conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access messages" ON messages;
DROP POLICY IF EXISTS "Service role full access summaries" ON conversation_summaries;

-- Politique: Les utilisateurs peuvent voir leurs propres conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres conversations
CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres conversations
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres conversations
CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;

-- Politique: Les utilisateurs peuvent voir les messages de leurs conversations
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Politique: Les utilisateurs peuvent créer des messages dans leurs conversations
CREATE POLICY "Users can create own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
    AND (messages.user_id = auth.uid() OR messages.user_id IS NULL)
  );

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view own summaries" ON conversation_summaries;
DROP POLICY IF EXISTS "Service role full access conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access messages" ON messages;
DROP POLICY IF EXISTS "Service role full access summaries" ON conversation_summaries;

-- Politique: Les utilisateurs peuvent voir leurs propres résumés
CREATE POLICY "Users can view own summaries"
  ON conversation_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_summaries.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Politique: Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role full access conversations"
  ON conversations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access messages"
  ON messages FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access summaries"
  ON conversation_summaries FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Commentaires
-- ============================================================================
COMMENT ON TABLE conversations IS 'Conversations (sessions de chat) des utilisateurs';
COMMENT ON TABLE messages IS 'Messages avec embeddings pour recherche sémantique';
COMMENT ON TABLE conversation_summaries IS 'Résumés périodiques des conversations pour mémoire long terme';
COMMENT ON COLUMN messages.embedding IS 'Embedding vectoriel (1536 dimensions pour OpenAI text-embedding-3-small)';
COMMENT ON COLUMN messages.is_summarized IS 'Indique si ce message a été inclus dans un résumé';
COMMENT ON FUNCTION search_semantic_messages IS 'Recherche sémantique de messages par similarité cosinus';
COMMENT ON FUNCTION get_recent_messages IS 'Récupère les N derniers messages d''une conversation';

