-- ============================================================================
-- CRÉATION DE LA TABLE vocabulary_chunks_embeddings
-- ============================================================================
-- Cette migration crée la table nécessaire pour l'indexation du vocabulaire
-- Exécutez ce script dans Supabase Dashboard > SQL Editor
-- ============================================================================

-- Activer l'extension pgvector si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Table: vocabulary_chunks_embeddings
-- ============================================================================
-- Vérifier d'abord le type de id dans vocabulary
DO $$
DECLARE
  vocab_id_type TEXT;
BEGIN
  -- Récupérer le type de la colonne id
  SELECT data_type INTO vocab_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vocabulary'
    AND column_name = 'id';
  
  IF vocab_id_type IS NULL THEN
    RAISE EXCEPTION 'Table vocabulary n''existe pas';
  END IF;
  
  RAISE NOTICE 'Type de vocabulary.id détecté: %', vocab_id_type;
  
  -- Créer la table avec le bon type selon le type détecté
  IF vocab_id_type = 'uuid' THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS vocabulary_chunks_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vocabulary_id UUID NOT NULL,
        user_id UUID NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(1536) NOT NULL,
        metadata JSONB DEFAULT ''{}''::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT fk_chunks_vocabulary FOREIGN KEY (vocabulary_id) 
          REFERENCES public.vocabulary(id) ON DELETE CASCADE,
        CONSTRAINT fk_chunks_user FOREIGN KEY (user_id) 
          REFERENCES auth.users(id) ON DELETE CASCADE
      )';
  ELSIF vocab_id_type = 'bigint' THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS vocabulary_chunks_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vocabulary_id BIGINT NOT NULL,
        user_id UUID NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding VECTOR(1536) NOT NULL,
        metadata JSONB DEFAULT ''{}''::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT fk_chunks_vocabulary FOREIGN KEY (vocabulary_id) 
          REFERENCES public.vocabulary(id) ON DELETE CASCADE,
        CONSTRAINT fk_chunks_user FOREIGN KEY (user_id) 
          REFERENCES auth.users(id) ON DELETE CASCADE
      )';
  ELSE
    RAISE EXCEPTION 'Type inattendu pour vocabulary.id: %', vocab_id_type;
  END IF;
  
  RAISE NOTICE '✅ Table vocabulary_chunks_embeddings créée avec vocabulary_id de type %', vocab_id_type;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_vocabulary_id ON vocabulary_chunks_embeddings(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_user_id ON vocabulary_chunks_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_created_at ON vocabulary_chunks_embeddings(created_at DESC);

-- Index vectoriel pour la recherche sémantique
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_embedding ON vocabulary_chunks_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Index composite
CREATE INDEX IF NOT EXISTS idx_vocab_chunks_user_vocabulary ON vocabulary_chunks_embeddings(user_id, vocabulary_id);

-- Index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocab_chunks_unique_vocabulary 
  ON vocabulary_chunks_embeddings(vocabulary_id);

-- ============================================================================
-- Fonction: Recherche sémantique
-- ============================================================================
-- Fonction de recherche (sera créée avec le bon type selon vocabulary.id)
DO $$
DECLARE
  vocab_id_type TEXT;
  function_sql TEXT;
BEGIN
  -- Récupérer le type de la colonne id
  SELECT data_type INTO vocab_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'vocabulary'
    AND column_name = 'id';
  
  -- Créer la fonction avec le bon type
  IF vocab_id_type = 'uuid' THEN
    function_sql := '
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
      ) AS $func$';
  ELSIF vocab_id_type = 'bigint' THEN
    function_sql := '
      CREATE OR REPLACE FUNCTION search_vocabulary_chunks(
        p_user_id UUID,
        p_query_embedding VECTOR(1536),
        p_limit INTEGER DEFAULT 10,
        p_similarity_threshold FLOAT DEFAULT 0.7,
        p_category_filter TEXT DEFAULT NULL
      )
      RETURNS TABLE (
        id UUID,
        vocabulary_id BIGINT,
        chunk_text TEXT,
        similarity FLOAT,
        word TEXT,
        definition TEXT,
        category TEXT,
        examples TEXT[],
        difficulty INTEGER,
        mastery INTEGER,
        vocabulary_updated_at TIMESTAMPTZ
      ) AS $func$';
  ELSE
    RAISE EXCEPTION 'Type inattendu pour vocabulary.id: %', vocab_id_type;
  END IF;
  
  -- Ajouter le corps de la fonction
  function_sql := function_sql || '
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
      $func$ LANGUAGE plpgsql SECURITY DEFINER;';
  
  EXECUTE function_sql;
  RAISE NOTICE '✅ Fonction search_vocabulary_chunks créée avec vocabulary_id de type %', vocab_id_type;
END $$;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================
ALTER TABLE vocabulary_chunks_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can create own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can update own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Users can delete own vocabulary chunks" ON vocabulary_chunks_embeddings;
DROP POLICY IF EXISTS "Service role full access vocabulary chunks" ON vocabulary_chunks_embeddings;

CREATE POLICY "Users can view own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access vocabulary chunks"
  ON vocabulary_chunks_embeddings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Vérification
-- ============================================================================
SELECT 
  '✅ Table créée' AS status,
  COUNT(*) AS tables_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'vocabulary_chunks_embeddings';

SELECT 
  '✅ Fonction créée' AS status,
  COUNT(*) AS functions_count
FROM pg_proc 
WHERE proname = 'search_vocabulary_chunks';

