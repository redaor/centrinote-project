-- ============================================================================
-- Système RAG pour indexation et recherche dans les notes Centrinote
-- ============================================================================
-- Ce fichier crée les tables et fonctions nécessaires pour transformer
-- toutes les notes de l'utilisateur en base de connaissances consultable par l'IA.
-- ============================================================================

-- Activer l'extension pgvector si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: note_chunks_embeddings
-- ============================================================================
-- Stocke les chunks de notes avec leurs embeddings pour la recherche sémantique
CREATE TABLE IF NOT EXISTS note_chunks_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, -- Index du chunk dans la note (0, 1, 2, ...)
  chunk_text TEXT NOT NULL, -- Texte du chunk
  embedding VECTOR(1536) NOT NULL, -- Embedding OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb, -- Métadonnées (tags, langue, type, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte: un chunk_index unique par note
  CONSTRAINT unique_chunk_per_note UNIQUE (note_id, chunk_index)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_note_chunks_note_id ON note_chunks_embeddings(note_id);
CREATE INDEX IF NOT EXISTS idx_note_chunks_user_id ON note_chunks_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_note_chunks_created_at ON note_chunks_embeddings(created_at DESC);

-- Index vectoriel pour la recherche sémantique (HNSW pour performance optimale)
CREATE INDEX IF NOT EXISTS idx_note_chunks_embedding ON note_chunks_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index composite pour recherche par utilisateur + similarité
CREATE INDEX IF NOT EXISTS idx_note_chunks_user_embedding ON note_chunks_embeddings(user_id)
  WHERE embedding IS NOT NULL;

-- ============================================================================
-- Fonction: Recherche sémantique de chunks de notes
-- ============================================================================
-- Recherche les K chunks les plus pertinents par similarité cosinus
-- Paramètres:
--   p_user_id: UUID de l'utilisateur
--   p_query_embedding: VECTOR(1536) - embedding de la requête
--   p_limit: INTEGER - nombre de résultats (défaut: 10)
--   p_min_similarity: FLOAT - score minimum de similarité (défaut: 0.7)
--   p_note_ids_filter: UUID[] - IDs de notes à filtrer (optionnel)
CREATE OR REPLACE FUNCTION search_relevant_note_chunks(
  p_user_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.7,
  p_note_ids_filter UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nce.id,
    nce.note_id,
    nce.chunk_index,
    nce.chunk_text,
    1 - (nce.embedding <=> p_query_embedding) AS similarity,
    nce.metadata
  FROM note_chunks_embeddings nce
  WHERE 
    nce.user_id = p_user_id
    AND nce.embedding IS NOT NULL
    AND 1 - (nce.embedding <=> p_query_embedding) >= p_min_similarity
    AND (p_note_ids_filter IS NULL OR nce.note_id = ANY(p_note_ids_filter))
  ORDER BY nce.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Fonction: Obtenir les métadonnées d'une note (titre, tags, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_note_metadata(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  user_id UUID,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n."userId" as user_id,
    COALESCE(
      ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
      ARRAY[]::TEXT[]
    ) as tags,
    n.created_at,
    n.updated_at
  FROM public.notes n
  LEFT JOIN public.note_tags nt ON n.id = nt.note_id
  LEFT JOIN public.tags t ON nt.tag_id = t.id
  WHERE n.id = p_note_id
  GROUP BY n.id, n.title, n."userId", n.created_at, n.updated_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger: Mettre à jour updated_at automatiquement
-- ============================================================================
CREATE OR REPLACE FUNCTION update_note_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_note_chunks_updated_at ON note_chunks_embeddings;

CREATE TRIGGER trigger_update_note_chunks_updated_at
  BEFORE UPDATE ON note_chunks_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_note_chunks_updated_at();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Activer RLS
ALTER TABLE note_chunks_embeddings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view own note chunks" ON note_chunks_embeddings;
DROP POLICY IF EXISTS "Service role full access note chunks" ON note_chunks_embeddings;

-- Politique: Les utilisateurs peuvent voir leurs propres chunks
CREATE POLICY "Users can view own note chunks"
  ON note_chunks_embeddings FOR SELECT
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
COMMENT ON COLUMN note_chunks_embeddings.metadata IS 'Métadonnées JSON (tags, langue, type de note, etc.)';
COMMENT ON FUNCTION search_relevant_note_chunks IS 'Recherche sémantique de chunks de notes par similarité cosinus';
COMMENT ON FUNCTION get_note_metadata IS 'Récupère les métadonnées d''une note (titre, tags, dates)';

