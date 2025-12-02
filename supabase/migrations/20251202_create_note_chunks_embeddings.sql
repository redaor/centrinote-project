-- ============================================================================
-- Système RAG pour indexation des notes Centrinote
-- ============================================================================
-- Cette migration crée la table pour stocker les chunks de notes avec leurs
-- embeddings vectoriels, permettant la recherche sémantique dans les notes.
-- ============================================================================

-- Activer l'extension pgvector si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: note_chunks_embeddings
-- ============================================================================
-- Stocke les chunks de notes avec leurs embeddings pour la recherche sémantique
CREATE TABLE IF NOT EXISTS note_chunks_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL, -- Index du chunk dans la note (0, 1, 2, ...)
  chunk_text TEXT NOT NULL, -- Texte du chunk
  embedding VECTOR(1536) NOT NULL, -- Embedding OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb, -- Métadonnées (tags, langue, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT fk_chunks_note FOREIGN KEY (note_id) 
    REFERENCES public.notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_chunks_user FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT check_chunk_index CHECK (chunk_index >= 0)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chunks_note_id ON note_chunks_embeddings(note_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON note_chunks_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON note_chunks_embeddings(created_at DESC);

-- Index vectoriel pour la recherche sémantique (HNSW pour performance optimale)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON note_chunks_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index composite pour recherche par utilisateur + note
CREATE INDEX IF NOT EXISTS idx_chunks_user_note ON note_chunks_embeddings(user_id, note_id);

-- Index unique pour éviter les doublons (même note, même chunk_index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_unique_note_chunk 
  ON note_chunks_embeddings(note_id, chunk_index);

-- ============================================================================
-- Fonction: Recherche sémantique de chunks de notes
-- ============================================================================
-- Recherche les K chunks les plus pertinents par similarité cosinus
-- Paramètres:
--   p_user_id: UUID de l'utilisateur
--   p_query_embedding: VECTOR(1536) - embedding de la requête
--   p_limit: INTEGER - nombre de résultats (défaut: 10)
--   p_similarity_threshold: FLOAT - seuil de similarité minimum (défaut: 0.7)
--   p_tag_filter: TEXT[] - tags optionnels pour filtrer (NULL = pas de filtre)
CREATE OR REPLACE FUNCTION search_note_chunks(
  p_user_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_tag_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  similarity FLOAT,
  note_title TEXT,
  note_tags TEXT[],
  note_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.note_id,
    c.chunk_index,
    c.chunk_text,
    1 - (c.embedding <=> p_query_embedding) AS similarity,
    n.title AS note_title,
    COALESCE(
      ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS note_tags,
    n.updated_at AS note_updated_at
  FROM note_chunks_embeddings c
  INNER JOIN public.notes n ON n.id = c.note_id
  LEFT JOIN public.note_tags nt ON nt.note_id = n.id
  LEFT JOIN public.tags t ON t.id = nt.tag_id
  WHERE 
    c.user_id = p_user_id
    AND 1 - (c.embedding <=> p_query_embedding) >= p_similarity_threshold
    AND (p_tag_filter IS NULL OR EXISTS (
      SELECT 1 FROM public.note_tags nt2
      INNER JOIN public.tags t2 ON t2.id = nt2.tag_id
      WHERE nt2.note_id = n.id
      AND t2.name = ANY(p_tag_filter)
    ))
  GROUP BY c.id, c.note_id, c.chunk_index, c.chunk_text, c.embedding, n.title, n.updated_at
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Fonction: Obtenir tous les chunks d'une note
-- ============================================================================
CREATE OR REPLACE FUNCTION get_note_chunks(
  p_note_id UUID
)
RETURNS TABLE (
  id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.chunk_index,
    c.chunk_text,
    c.created_at
  FROM note_chunks_embeddings c
  WHERE c.note_id = p_note_id
  ORDER BY c.chunk_index ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Mettre à jour updated_at automatiquement
-- ============================================================================
CREATE OR REPLACE FUNCTION update_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chunks_updated_at ON note_chunks_embeddings;

CREATE TRIGGER trigger_update_chunks_updated_at
  BEFORE UPDATE ON note_chunks_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_chunks_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Activer RLS
ALTER TABLE note_chunks_embeddings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view own note chunks" ON note_chunks_embeddings;
DROP POLICY IF EXISTS "Users can create own note chunks" ON note_chunks_embeddings;
DROP POLICY IF EXISTS "Users can update own note chunks" ON note_chunks_embeddings;
DROP POLICY IF EXISTS "Users can delete own note chunks" ON note_chunks_embeddings;
DROP POLICY IF EXISTS "Service role full access note chunks" ON note_chunks_embeddings;

-- Politique: Les utilisateurs peuvent voir leurs propres chunks
CREATE POLICY "Users can view own note chunks"
  ON note_chunks_embeddings FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres chunks
CREATE POLICY "Users can create own note chunks"
  ON note_chunks_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent mettre à jour leurs propres chunks
CREATE POLICY "Users can update own note chunks"
  ON note_chunks_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres chunks
CREATE POLICY "Users can delete own note chunks"
  ON note_chunks_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Politique: Service role peut tout faire (pour les Edge Functions)
CREATE POLICY "Service role full access note chunks"
  ON note_chunks_embeddings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Commentaires
-- ============================================================================
COMMENT ON TABLE note_chunks_embeddings IS 'Chunks de notes avec embeddings pour recherche sémantique RAG';
COMMENT ON COLUMN note_chunks_embeddings.chunk_index IS 'Index du chunk dans la note (0 = premier chunk)';
COMMENT ON COLUMN note_chunks_embeddings.embedding IS 'Embedding vectoriel (1536 dimensions pour OpenAI text-embedding-3-small)';
COMMENT ON COLUMN note_chunks_embeddings.metadata IS 'Métadonnées JSON (tags, langue, type, etc.)';
COMMENT ON FUNCTION search_note_chunks IS 'Recherche sémantique de chunks de notes par similarité cosinus avec filtres optionnels';
COMMENT ON FUNCTION get_note_chunks IS 'Récupère tous les chunks d''une note spécifique';

