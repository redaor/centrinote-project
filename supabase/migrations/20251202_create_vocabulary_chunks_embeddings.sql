-- ============================================================================
-- Système RAG pour indexation du vocabulaire Centrinote
-- ============================================================================
-- Cette migration crée la table pour stocker les chunks de vocabulaire avec leurs
-- embeddings vectoriels, permettant la recherche sémantique dans le vocabulaire.
-- ============================================================================

-- Activer l'extension pgvector si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: vocabulary_chunks_embeddings
-- ============================================================================
-- Stocke les entrées de vocabulaire avec leurs embeddings pour la recherche sémantique
-- Une entrée de vocabulaire = un chunk (word + definition + examples)
CREATE TABLE IF NOT EXISTS vocabulary_chunks_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocabulary_id UUID NOT NULL,
  user_id UUID NOT NULL,
  chunk_text TEXT NOT NULL, -- Texte complet : word + definition + examples
  embedding VECTOR(1536) NOT NULL, -- Embedding OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb, -- Métadonnées (category, difficulty, mastery, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT fk_chunks_vocabulary FOREIGN KEY (vocabulary_id) 
    REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  CONSTRAINT fk_chunks_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_vocabulary_id ON vocabulary_chunks_embeddings(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_user_id ON vocabulary_chunks_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_created_at ON vocabulary_chunks_embeddings(created_at DESC);

-- Index vectoriel pour la recherche sémantique (HNSW pour performance optimale)
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_embedding ON vocabulary_chunks_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index composite pour recherche par utilisateur + vocabulaire
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_user_vocabulary ON vocabulary_chunks_embeddings(user_id, vocabulary_id);

-- Index unique pour éviter les doublons (même vocabulaire)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_chunks_unique_vocabulary 
  ON vocabulary_chunks_embeddings(vocabulary_id);

-- ============================================================================
-- Fonction: Recherche sémantique de chunks de vocabulaire
-- ============================================================================
-- Recherche les K entrées de vocabulaire les plus pertinentes par similarité cosinus
-- Paramètres:
--   p_user_id: UUID de l'utilisateur
--   p_query_embedding: VECTOR(1536) - embedding de la requête
--   p_limit: INTEGER - nombre de résultats (défaut: 10)
--   p_similarity_threshold: FLOAT - seuil de similarité minimum (défaut: 0.7)
--   p_category_filter: TEXT - catégorie optionnelle pour filtrer (NULL = pas de filtre)
CREATE OR REPLACE FUNCTION search_vocabulary_chunks(
  p_user_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_category_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  vocabulary_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  word TEXT,
  definition TEXT,
  category TEXT,
  examples TEXT[],
  difficulty INTEGER,
  mastery INTEGER,
  vocabulary_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.vocabulary_id,
    c.chunk_text,
    1 - (c.embedding <=> p_query_embedding) AS similarity,
    v.word,
    v.definition,
    v.category,
    ARRAY(SELECT jsonb_array_elements_text(v.examples)) AS examples,
    v.difficulty,
    v.mastery,
    v.updated_at AS vocabulary_updated_at
  FROM vocabulary_chunks_embeddings c
  INNER JOIN public.vocabulary v ON v.id = c.vocabulary_id
  WHERE 
    c.user_id = p_user_id
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_threshold
    AND (p_category_filter IS NULL OR v.category = p_category_filter)
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Fonction: Obtenir tous les chunks d'une entrée de vocabulaire
-- ============================================================================
CREATE OR REPLACE FUNCTION get_vocabulary_chunks(
  p_vocabulary_id UUID
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.chunk_text,
    c.created_at
  FROM vocabulary_chunks_embeddings c
  WHERE c.vocabulary_id = p_vocabulary_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Mettre à jour updated_at automatiquement
-- ============================================================================
CREATE OR REPLACE FUNCTION update_vocab_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vocab_chunks_updated_at ON vocabulary_chunks_embeddings;

CREATE TRIGGER trigger_update_vocab_chunks_updated_at
  BEFORE UPDATE ON vocabulary_chunks_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_vocab_chunks_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Activer RLS
ALTER TABLE vocabulary_chunks_embeddings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can create own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can update own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can delete own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Service role full access vocabulary chunks" ON vocabulary_chunks_embeddings;

-- Politique: Les utilisateurs peuvent voir leurs propres chunks
CREATE POLICY "Users can view own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres chunks
CREATE POLICY "Users can create own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres chunks
CREATE POLICY "Users can update own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres chunks
CREATE POLICY "Users can delete own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Politique: Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role full access vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Commentaires
-- ============================================================================
COMMENT ON TABLE vocabulary_chunks_embeddings IS 'Entrées de vocabulaire avec embeddings pour recherche sémantique RAG';
COMMENT ON COLUMN vocabulary_chunks_embeddings.embedding IS 'Embedding vectoriel (1536 dimensions pour OpenAI text-embedding-3-small)';
COMMENT ON COLUMN vocabulary_chunks_embeddings.metadata IS 'Métadonnées JSON (category, difficulty, mastery, etc.)';
COMMENT ON FUNCTION search_vocabulary_chunks IS 'Recherche sémantique d''entrées de vocabulaire par similarité cosinus avec filtres optionnels';
COMMENT ON FUNCTION get_vocabulary_chunks IS 'Récupère tous les chunks d''une entrée de vocabulaire spécifique';

