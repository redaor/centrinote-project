/*
  # Création de la table Vocabulary
  
  1. Nouvelle Table
    - `vocabulary`
      - `id` (uuid, clé primaire)
      - `userId` (uuid, non null, référence à auth.users)
      - `word` (text, non null)
      - `definition` (text, non null)
      - `pronunciation` (text)
      - `category` (text, non null)
      - `examples` (jsonb, tableau de string)
      - `difficulty` (integer, 1-5)
      - `mastery` (integer, 0-100, défaut 0)
      - `last_reviewed` (timestamp with time zone)
      - `times_reviewed` (integer, défaut 0)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      - `updated_at` (timestamp with time zone, valeur par défaut now())
  
  2. Sécurité
    - Activation de RLS sur la table vocabulary
    - Policies pour permettre aux utilisateurs de gérer uniquement leur propre vocabulaire
    
  3. Index pour les performances
    - Index sur userId
    - Index sur word pour la recherche
    - Index sur category pour le filtrage
    - Index unique sur (word, userId) pour éviter les doublons
*/

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table du vocabulaire
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  definition text NOT NULL,
  pronunciation text,
  category text NOT NULL DEFAULT 'General',
  examples jsonb DEFAULT '[]'::jsonb,
  difficulty integer CHECK (difficulty >= 1 AND difficulty <= 5) DEFAULT 1,
  mastery integer CHECK (mastery >= 0 AND mastery <= 100) DEFAULT 0,
  last_reviewed timestamp with time zone,
  times_reviewed integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

-- Policies pour la table vocabulary
CREATE POLICY "vocabulary_select" ON public.vocabulary
  FOR SELECT TO public
  USING ("userId" = auth.uid());

CREATE POLICY "vocabulary_insert" ON public.vocabulary
  FOR INSERT TO public
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "vocabulary_update" ON public.vocabulary
  FOR UPDATE TO public
  USING ("userId" = auth.uid());

CREATE POLICY "vocabulary_delete" ON public.vocabulary
  FOR DELETE TO public
  USING ("userId" = auth.uid());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON public.vocabulary("userId");
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON public.vocabulary(word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_category ON public.vocabulary(category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery ON public.vocabulary(mastery);
CREATE INDEX IF NOT EXISTS idx_vocabulary_last_reviewed ON public.vocabulary(last_reviewed);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_word_user_id ON public.vocabulary(word, "userId");

-- Trigger pour mettre à jour le champ updated_at
CREATE TRIGGER update_vocabulary_updated_at
  BEFORE UPDATE ON public.vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour recherche dans le vocabulaire
CREATE OR REPLACE FUNCTION search_vocabulary(search_term text, user_id uuid)
RETURNS TABLE (
  id uuid,
  "userId" uuid,
  word text,
  definition text,
  pronunciation text,
  category text,
  examples jsonb,
  difficulty integer,
  mastery integer,
  last_reviewed timestamp with time zone,
  times_reviewed integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v."userId", v.word, v.definition, v.pronunciation, v.category, 
         v.examples, v.difficulty, v.mastery, v.last_reviewed, v.times_reviewed,
         v.created_at, v.updated_at
  FROM public.vocabulary v
  WHERE v."userId" = user_id
  AND (
    v.word ILIKE '%' || search_term || '%' OR
    v.definition ILIKE '%' || search_term || '%' OR
    v.category ILIKE '%' || search_term || '%'
  )
  ORDER BY v.word;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques du vocabulaire
CREATE OR REPLACE FUNCTION get_vocabulary_stats(user_id uuid)
RETURNS TABLE (
  total_words bigint,
  mastered_words bigint,
  learning_words bigint,
  average_mastery numeric,
  categories_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_words,
    COUNT(*) FILTER (WHERE mastery >= 80) as mastered_words,
    COUNT(*) FILTER (WHERE mastery < 80) as learning_words,
    ROUND(AVG(mastery), 2) as average_mastery,
    COUNT(DISTINCT category) as categories_count
  FROM public.vocabulary v
  WHERE v."userId" = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;