/*
  # Structure complète du système de notes
  
  1. Tables
    - `notes` - Table principale pour stocker les notes des utilisateurs
    - `tags` - Table pour stocker les tags/étiquettes
    - `note_tags` - Table de relation entre notes et tags
    - `note_attachments` - Table pour les pièces jointes des notes
  
  2. Vues
    - `notes_with_tags` - Vue qui joint les notes avec leurs tags
  
  3. Fonctions
    - `update_updated_at_column()` - Met à jour le timestamp
    - `search_notes()` - Recherche dans les notes
    - `get_notes_by_tag()` - Filtre les notes par tag
  
  4. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour chaque opération CRUD
*/

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table des notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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

-- Table des tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, name)
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
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Activer RLS sur la table note_tags
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;

-- Policies pour la table note_tags
CREATE POLICY "Users can view their own note_tags" 
ON note_tags FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_tags.note_id
        AND notes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own note_tags" 
ON note_tags FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_tags.note_id
        AND notes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own note_tags" 
ON note_tags FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_tags.note_id
        AND notes.user_id = auth.uid()
    )
);

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_note_attachments_updated_at
BEFORE UPDATE ON note_attachments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS sur la table note_attachments
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- Policies pour la table note_attachments
CREATE POLICY "Users can view their own note_attachments" 
ON note_attachments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_attachments.note_id
        AND notes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own note_attachments" 
ON note_attachments FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_attachments.note_id
        AND notes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own note_attachments" 
ON note_attachments FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_attachments.note_id
        AND notes.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own note_attachments" 
ON note_attachments FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM notes
        WHERE notes.id = note_attachments.note_id
        AND notes.user_id = auth.uid()
    )
);

-- Vue pour récupérer les notes avec leurs tags
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
        (SELECT json_agg(
            json_build_object(
                'id', t.id,
                'name', t.name,
                'color', t.color
            )
        )
        FROM note_tags nt
        JOIN tags t ON nt.tag_id = t.id
        WHERE nt.note_id = n.id), 
        '[]'::json
    ) as tags,
    EXISTS (
        SELECT 1 FROM note_attachments
        WHERE note_id = n.id
    ) as has_attachment
FROM notes n;

-- Fonction pour rechercher des notes
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

-- Fonction pour récupérer les notes par tag
CREATE OR REPLACE FUNCTION get_notes_by_tag(tag_id UUID)
RETURNS SETOF notes_with_tags
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM notes_with_tags
    WHERE 
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM note_tags nt
            WHERE nt.note_id = notes_with_tags.id
            AND nt.tag_id = get_notes_by_tag.tag_id
        )
    ORDER BY is_pinned DESC, updated_at DESC;
$$;

-- Créer un bucket pour les pièces jointes
INSERT INTO storage.buckets (id, name, public) VALUES ('note-attachments', 'note-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policy pour le bucket note-attachments
CREATE POLICY "Users can access their own attachments" ON storage.objects
FOR ALL USING (
    bucket_id = 'note-attachments' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM notes WHERE user_id = auth.uid()
    )
);