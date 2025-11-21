/*
  # Migration: Table user_embeddings pour enrichissement automatique IA
  
  Cette migration crée la table user_embeddings qui stocke les embeddings vectoriels
  des notes et du vocabulaire utilisateur pour l'enrichissement automatique des réponses IA.
  
  1. Extension pgvector
  2. Table user_embeddings avec colonne embedding vector(1536)
  3. Index IVFFlat pour recherche de similarité rapide
  4. RLS policies pour sécurité
  5. Triggers pour mise à jour automatique
*/

-- Activer l'extension pgvector (nécessite d'être activée dans Supabase Dashboard)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table pour stocker les embeddings
CREATE TABLE IF NOT EXISTS public.user_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  vocabulary_id bigint REFERENCES public.vocabulary(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('note', 'vocabulary')),
  content text NOT NULL, -- Texte original pour référence
  embedding vector(1536) NOT NULL, -- Embedding OpenAI text-embedding-3-small
  metadata jsonb DEFAULT '{}'::jsonb, -- Métadonnées supplémentaires (titre, catégorie, etc.)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Contrainte: soit note_id soit vocabulary_id doit être défini
  CONSTRAINT check_reference CHECK (
    (note_id IS NOT NULL AND vocabulary_id IS NULL) OR
    (note_id IS NULL AND vocabulary_id IS NOT NULL)
  )
);

-- Index pour recherche rapide par user_id
CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_id ON public.user_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_embeddings_note_id ON public.user_embeddings(note_id) WHERE note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_embeddings_vocabulary_id ON public.user_embeddings(vocabulary_id) WHERE vocabulary_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_embeddings_content_type ON public.user_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_user_embeddings_created_at ON public.user_embeddings(created_at DESC);

-- Index IVFFlat pour recherche de similarité vectorielle (nécessite au moins quelques données)
-- Note: L'index IVFFlat sera créé après avoir des données (voir commentaire ci-dessous)
-- CREATE INDEX idx_user_embeddings_embedding_ivfflat ON public.user_embeddings 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index unique pour éviter les doublons (même note/vocabulaire pour le même user)
-- Utiliser une contrainte unique partielle pour chaque type
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_embeddings_unique_note 
ON public.user_embeddings(user_id, note_id) 
WHERE note_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_embeddings_unique_vocab 
ON public.user_embeddings(user_id, vocabulary_id) 
WHERE vocabulary_id IS NOT NULL;

-- Activer RLS
ALTER TABLE public.user_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "user_embeddings_select" ON public.user_embeddings
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "user_embeddings_insert" ON public.user_embeddings
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_embeddings_update" ON public.user_embeddings
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "user_embeddings_delete" ON public.user_embeddings
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_user_embeddings_updated_at
  BEFORE UPDATE ON public.user_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour recherche de similarité vectorielle
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  query_embedding vector(1536),
  target_user_id uuid,
  similarity_threshold float DEFAULT 0.8,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  note_id uuid,
  vocabulary_id bigint,
  content_type text,
  content text,
  metadata jsonb,
  similarity float,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.note_id,
    e.vocabulary_id,
    e.content_type,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity, -- Distance cosine (<=>) convertie en similarité
    e.created_at
  FROM public.user_embeddings e
  WHERE e.user_id = target_user_id
    AND 1 - (e.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY e.embedding <=> query_embedding -- Trier par distance croissante
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les embeddings orphelins (si note/vocab supprimé)
CREATE OR REPLACE FUNCTION cleanup_orphaned_embeddings()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_embeddings
  WHERE (note_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.notes WHERE id = note_id))
     OR (vocabulary_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vocabulary WHERE id = vocabulary_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire pour créer l'index IVFFlat après avoir des données
COMMENT ON TABLE public.user_embeddings IS 
'Table stockant les embeddings vectoriels pour enrichissement automatique IA. 
Pour créer l''index IVFFlat après avoir au moins 1000 embeddings:
CREATE INDEX idx_user_embeddings_embedding_ivfflat ON public.user_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);';

