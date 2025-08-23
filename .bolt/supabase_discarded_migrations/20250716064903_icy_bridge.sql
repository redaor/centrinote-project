/*
  # Structure complète du système de notes

  1. Tables
    - `notes` - Table principale pour stocker les notes
    - `note_tags` - Table de relation entre notes et tags
    - `tags` - Table des tags disponibles
    - `note_attachments` - Table pour les pièces jointes aux notes
  
  2. Fonctions et Triggers
    - Fonction pour mettre à jour le timestamp `updated_at`
    - Trigger pour appliquer cette fonction automatiquement
  
  3. Policies RLS
    - Policies pour chaque table assurant que les utilisateurs ne peuvent accéder qu'à leurs propres données
*/

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table des notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Activer RLS sur la table notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policies pour la table notes
CREATE POLICY "Users can view their own notes" 
  ON notes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
  ON notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
  ON notes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
  ON notes FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table des tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Couleur bleue par défaut
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(name, user_id) -- Un utilisateur ne peut pas avoir deux tags avec le même nom
);

-- Activer RLS sur la table tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policies pour la table tags
CREATE POLICY "Users can view their own tags" 
  ON tags FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
  ON tags FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
  ON tags FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
  ON tags FOR DELETE 
  USING (auth.uid() = user_id);

-- Table de relation entre notes et tags
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(note_id, tag_id) -- Éviter les doublons
);

-- Activer RLS sur la table note_tags
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

-- Policies pour la table note_tags
-- Utilisation de sous-requêtes pour vérifier que l'utilisateur est propriétaire de la note et du tag
CREATE POLICY "Users can view their own note_tags" 
  ON note_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own note_tags" 
  ON note_tags FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own note_tags" 
  ON note_tags FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS note_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Activer RLS sur la table note_attachments
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- Policies pour la table note_attachments
CREATE POLICY "Users can view their own note attachments" 
  ON note_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own note attachments" 
  ON note_attachments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own note attachments" 
  ON note_attachments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own note attachments" 
  ON note_attachments FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_id 
      AND notes.user_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_note_attachments_updated_at
  BEFORE UPDATE ON note_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_note_attachments_note_id ON note_attachments(note_id);

-- Vue pour faciliter la récupération des notes avec leurs tags
CREATE OR REPLACE VIEW notes_with_tags AS
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.content,
  n.is_pinned,
  n.created_at,
  n.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', t.id,
        'name', t.name,
        'color', t.color
      )
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) as tags,
  EXISTS (
    SELECT 1 FROM note_attachments na 
    WHERE na.note_id = n.id
  ) as has_attachment
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
GROUP BY n.id;

-- Activer RLS sur la vue
ALTER VIEW notes_with_tags SECURITY INVOKER;

-- Fonction pour rechercher des notes par texte
CREATE OR REPLACE FUNCTION search_notes(search_term TEXT)
RETURNS SETOF notes_with_tags
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM notes_with_tags
  WHERE 
    user_id = auth.uid() AND
    (
      title ILIKE '%' || search_term || '%' OR
      content ILIKE '%' || search_term || '%' OR
      EXISTS (
        SELECT 1 FROM note_tags nt
        JOIN tags t ON nt.tag_id = t.id
        WHERE nt.note_id = notes_with_tags.id
        AND t.name ILIKE '%' || search_term || '%'
      )
    )
  ORDER BY is_pinned DESC, updated_at DESC;
$$;

-- Fonction pour obtenir les notes filtrées par tag
CREATE OR REPLACE FUNCTION get_notes_by_tag(tag_id UUID)
RETURNS SETOF notes_with_tags
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM notes_with_tags
  WHERE 
    user_id = auth.uid() AND
    id IN (
      SELECT note_id FROM note_tags
      WHERE tag_id = tag_id
    )
  ORDER BY is_pinned DESC, updated_at DESC;
$$;

-- Commentaires explicatifs sur la sécurité
COMMENT ON TABLE notes IS 'Table principale pour stocker les notes des utilisateurs';
COMMENT ON TABLE tags IS 'Table pour stocker les tags créés par les utilisateurs';
COMMENT ON TABLE note_tags IS 'Table de relation entre notes et tags';
COMMENT ON TABLE note_attachments IS 'Table pour stocker les pièces jointes aux notes';

COMMENT ON POLICY "Users can view their own notes" ON notes IS 'Les utilisateurs ne peuvent voir que leurs propres notes';
COMMENT ON POLICY "Users can create their own notes" ON notes IS 'Les utilisateurs ne peuvent créer des notes que pour eux-mêmes';
COMMENT ON POLICY "Users can update their own notes" ON notes IS 'Les utilisateurs ne peuvent mettre à jour que leurs propres notes';
COMMENT ON POLICY "Users can delete their own notes" ON notes IS 'Les utilisateurs ne peuvent supprimer que leurs propres notes';

COMMENT ON FUNCTION search_notes(TEXT) IS 'Fonction sécurisée pour rechercher des notes par texte, limitée aux notes de l''utilisateur authentifié';
COMMENT ON FUNCTION get_notes_by_tag(UUID) IS 'Fonction sécurisée pour filtrer les notes par tag, limitée aux notes de l''utilisateur authentifié';