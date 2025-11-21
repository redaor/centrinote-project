/*
  # Création des tables Notes et Tags
  
  1. Nouvelles Tables
    - `notes`
      - `id` (uuid, clé primaire)
      - `userId` (uuid, non null, référence à auth.users)
      - `title` (text, non null)
      - `content` (text)
      - `is_pinned` (boolean, défaut false)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      - `updated_at` (timestamp with time zone, valeur par défaut now())
      - `has_attachment` (boolean, défaut false)
      
    - `tags`
      - `id` (uuid, clé primaire)
      - `name` (text, non null)
      - `color` (text, défaut '#3B82F6')
      - `user_id` (uuid, non null, référence à auth.users)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      
    - `note_tags` (table de liaison)
      - `id` (uuid, clé primaire)
      - `note_id` (uuid, référence à notes)
      - `tag_id` (uuid, référence à tags)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      
    - `note_attachments`
      - `id` (uuid, clé primaire)
      - `note_id` (uuid, référence à notes)
      - `file_name` (text, non null)
      - `file_type` (text, non null)
      - `file_size` (bigint, non null)
      - `file_path` (text, non null)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      - `updated_at` (timestamp with time zone, valeur par défaut now())
  
  2. Sécurité
    - Activation de RLS sur toutes les tables
    - Policies pour permettre aux utilisateurs de gérer uniquement leurs propres données
    
  3. Index pour les performances
    - Index sur user_id pour notes et tags
    - Index sur note_id et tag_id pour note_tags
    - Index unique sur (name, user_id) pour tags
*/

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des notes
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  is_pinned boolean DEFAULT false,
  has_attachment boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table des tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Table de liaison note_tags
CREATE TABLE IF NOT EXISTS public.note_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Table des pièces jointes
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_path text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- Policies pour la table notes
CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO public
  USING ("userId" = auth.uid());

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO public
  WITH CHECK ("userId" = auth.uid());

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO public
  USING ("userId" = auth.uid());

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO public
  USING ("userId" = auth.uid());

-- Policies pour la table tags
CREATE POLICY "tags_select" ON public.tags
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "tags_insert" ON public.tags
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "tags_update" ON public.tags
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "tags_delete" ON public.tags
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- Policies pour la table note_tags
CREATE POLICY "note_tags_select" ON public.note_tags
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes."userId" = auth.uid()
    )
  );

CREATE POLICY "note_tags_insert" ON public.note_tags
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes."userId" = auth.uid()
    )
  );

CREATE POLICY "note_tags_delete" ON public.note_tags
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_tags.note_id 
      AND notes."userId" = auth.uid()
    )
  );

-- Policies pour la table note_attachments
CREATE POLICY "note_attachments_select" ON public.note_attachments
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_attachments.note_id 
      AND notes."userId" = auth.uid()
    )
  );

CREATE POLICY "note_attachments_insert" ON public.note_attachments
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_attachments.note_id 
      AND notes."userId" = auth.uid()
    )
  );

CREATE POLICY "note_attachments_update" ON public.note_attachments
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_attachments.note_id 
      AND notes."userId" = auth.uid()
    )
  );

CREATE POLICY "note_attachments_delete" ON public.note_attachments
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.notes 
      WHERE notes.id = note_attachments.note_id 
      AND notes."userId" = auth.uid()
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes("userId");
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_user_id ON public.tags(name, user_id);

CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON public.note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON public.note_tags(tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_note_tags_unique ON public.note_tags(note_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);

-- Triggers pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_attachments_updated_at
  BEFORE UPDATE ON public.note_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour recherche full-text sur les notes
CREATE OR REPLACE FUNCTION search_notes(search_term text, user_id uuid)
RETURNS TABLE (
  id uuid,
  "userId" uuid,
  title text,
  content text,
  is_pinned boolean,
  has_attachment boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n."userId", n.title, n.content, n.is_pinned, n.has_attachment, n.created_at, n.updated_at
  FROM public.notes n
  WHERE n."userId" = user_id
  AND (
    n.title ILIKE '%' || search_term || '%' OR
    n.content ILIKE '%' || search_term || '%'
  )
  ORDER BY n.is_pinned DESC, n.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;