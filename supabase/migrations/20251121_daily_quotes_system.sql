-- =====================================================
-- Module Citations du Jour - Système autonome
-- Ne touche AUCUNE table existante
-- =====================================================

-- 1. Table daily_quotes
CREATE TABLE IF NOT EXISTS daily_quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote       text NOT NULL,
  author      text,
  category    text DEFAULT 'motivation',
  language    text DEFAULT 'fr',
  used_at     date,              -- date d'envoi (évite répétition même jour)
  created_at  timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_quote_lang_cat_used 
  ON daily_quotes(language, category, used_at);

-- Commentaires
COMMENT ON TABLE daily_quotes IS 'Citations du jour - système autonome pour les automatisations';
COMMENT ON COLUMN daily_quotes.used_at IS 'Date de dernière utilisation (NULL = jamais utilisée)';

-- 2. Fonction SQL pour récupérer une citation non utilisée aujourd'hui
CREATE OR REPLACE FUNCTION get_today_quote(
  lang text DEFAULT 'fr', 
  cat text DEFAULT 'motivation'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  q jsonb;
BEGIN
  -- Essayer de trouver une citation non utilisée aujourd'hui
  SELECT to_jsonb(d.*) INTO q
  FROM   daily_quotes d
  WHERE  d.language = lang
  AND    d.category = cat
  AND    (d.used_at IS NULL OR d.used_at < current_date)
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Si aucune citation neuve, recycler la plus ancienne
  IF q IS NULL THEN
     SELECT to_jsonb(d.*) INTO q
     FROM   daily_quotes d
     WHERE  d.language = lang
     AND    d.category = cat
     ORDER BY d.used_at ASC NULLS FIRST
     LIMIT 1;
  END IF;

  -- Marquer comme utilisée aujourd'hui
  IF q IS NOT NULL THEN
    UPDATE daily_quotes 
    SET used_at = current_date 
    WHERE id = (q->>'id')::uuid;
  END IF;

  RETURN q;
END;
$$;

COMMENT ON FUNCTION get_today_quote IS 'Récupère une citation non utilisée aujourd''hui, ou recycle la plus ancienne';

-- 3. RLS (Row Level Security) - permettre lecture publique pour les Edge Functions
ALTER TABLE daily_quotes ENABLE ROW LEVEL SECURITY;

-- Policy pour service_role (Edge Functions)
CREATE POLICY "Service role can read all quotes"
  ON daily_quotes
  FOR SELECT
  TO service_role
  USING (true);

-- Policy pour authenticated users (lecture seulement)
CREATE POLICY "Authenticated users can read quotes"
  ON daily_quotes
  FOR SELECT
  TO authenticated
  USING (true);

-- 4. Insertion de quelques citations initiales (exemples)
INSERT INTO daily_quotes (quote, author, category, language) VALUES
  ('Le succès, c''est tomber sept fois, se relever huit.', 'Proverbe japonais', 'motivation', 'fr'),
  ('La vie est ce qui vous arrive pendant que vous êtes occupé à faire d''autres projets.', 'John Lennon', 'motivation', 'fr'),
  ('L''avenir appartient à ceux qui croient en la beauté de leurs rêves.', 'Eleanor Roosevelt', 'motivation', 'fr'),
  ('Le seul moyen de faire du bon travail est d''aimer ce que vous faites.', 'Steve Jobs', 'motivation', 'fr'),
  ('Ne vous inquiétez pas des échecs, inquiétez-vous des chances que vous manquez quand vous n''essayez même pas.', 'Jack Canfield', 'motivation', 'fr'),
  ('La seule façon de faire du bon travail est d''aimer ce que vous faites.', 'Steve Jobs', 'motivation', 'fr'),
  ('Le succès n''est pas final, l''échec n''est pas fatal : c''est le courage de continuer qui compte.', 'Winston Churchill', 'motivation', 'fr'),
  ('Votre limitation n''est que votre imagination.', 'Inconnu', 'motivation', 'fr'),
  ('Poussez-vous, parce que personne d''autre ne le fera pour vous.', 'Inconnu', 'motivation', 'fr'),
  ('Le succès est la somme de petits efforts répétés jour après jour.', 'Robert Collier', 'motivation', 'fr')
ON CONFLICT DO NOTHING;

