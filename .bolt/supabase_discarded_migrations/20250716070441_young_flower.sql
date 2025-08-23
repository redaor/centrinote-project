/*
# Configuration complète du système de notes

1. Structure
   - Table `notes` pour stocker les notes des utilisateurs
   - Indexes pour optimiser les performances des requêtes
   - Champs created_at et updated_at avec gestion automatique

2. Sécurité
   - Activation de Row Level Security (RLS)
   - Policies pour SELECT, INSERT, UPDATE, DELETE
   - Utilisation de auth.uid() pour l'authentification

3. Automatisation
   - Fonction pour mettre à jour le champ updated_at
   - Trigger pour appeler cette fonction à chaque modification
*/

-- Vérification préalable pour éviter les erreurs "type already exists"
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'not_started', 'past_due', 'paused', 'trialing', 'unpaid');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Création de la table notes si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON public.notes(created_at);
CREATE INDEX IF NOT EXISTS notes_is_pinned_idx ON public.notes(is_pinned);

-- Activation de Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Suppression des policies existantes pour éviter les doublons
DROP POLICY IF EXISTS "Allow read own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow update own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow insert own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow delete own notes" ON public.notes;

-- Création des policies RLS pour sécuriser l'accès
CREATE POLICY "Allow read own notes"
ON public.notes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Allow update own notes"
ON public.notes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Allow insert own notes"
ON public.notes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow delete own notes"
ON public.notes
FOR DELETE
USING (user_id = auth.uid());

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppression du trigger existant s'il existe
DROP TRIGGER IF EXISTS set_updated_at ON public.notes;

-- Création du trigger pour mettre à jour updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table pour les tags
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Index pour la table tags
CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);

-- Activation de RLS pour tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Policies pour tags
DROP POLICY IF EXISTS "Allow read own tags" ON public.tags;
DROP POLICY IF EXISTS "Allow insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Allow update own tags" ON public.tags;
DROP POLICY IF EXISTS "Allow delete own tags" ON public.tags;

CREATE POLICY "Allow read own tags"
ON public.tags
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Allow insert own tags"
ON public.tags
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow update own tags"
ON public.tags
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Allow delete own tags"
ON public.tags
FOR DELETE
USING (user_id = auth.uid());

-- Table de relation entre notes et tags
CREATE TABLE IF NOT EXISTS public.note_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    UNIQUE(note_id, tag_id)
);

-- Index pour la table note_tags
CREATE INDEX IF NOT EXISTS note_tags_note_id_idx ON public.note_tags(note_id);
CREATE INDEX IF NOT EXISTS note_tags_tag_id_idx ON public.note_tags(tag_id);

-- Activation de RLS pour note_tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

-- Policies pour note_tags
DROP POLICY IF EXISTS "Allow read own note_tags" ON public.note_tags;
DROP POLICY IF EXISTS "Allow insert own note_tags" ON public.note_tags;
DROP POLICY IF EXISTS "Allow delete own note_tags" ON public.note_tags;

CREATE POLICY "Allow read own note_tags"
ON public.note_tags
FOR SELECT
USING (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Allow insert own note_tags"
ON public.note_tags
FOR INSERT
WITH CHECK (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    ) AND
    tag_id IN (
        SELECT id FROM public.tags WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Allow delete own note_tags"
ON public.note_tags
FOR DELETE
USING (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    )
);

-- Création du bucket pour les pièces jointes si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'note-attachments'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('note-attachments', 'note-attachments', false);
    END IF;
END $$;

-- Table pour les pièces jointes
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour la table note_attachments
CREATE INDEX IF NOT EXISTS note_attachments_note_id_idx ON public.note_attachments(note_id);

-- Activation de RLS pour note_attachments
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- Policies pour note_attachments
DROP POLICY IF EXISTS "Allow read own note_attachments" ON public.note_attachments;
DROP POLICY IF EXISTS "Allow insert own note_attachments" ON public.note_attachments;
DROP POLICY IF EXISTS "Allow delete own note_attachments" ON public.note_attachments;

CREATE POLICY "Allow read own note_attachments"
ON public.note_attachments
FOR SELECT
USING (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Allow insert own note_attachments"
ON public.note_attachments
FOR INSERT
WITH CHECK (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Allow delete own note_attachments"
ON public.note_attachments
FOR DELETE
USING (
    note_id IN (
        SELECT id FROM public.notes WHERE user_id = auth.uid()
    )
);

-- Trigger pour mettre à jour updated_at sur note_attachments
DROP TRIGGER IF EXISTS set_updated_at_attachments ON public.note_attachments;

CREATE TRIGGER set_updated_at_attachments
BEFORE UPDATE ON public.note_attachments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Vue pour récupérer les notes avec leurs tags
CREATE OR REPLACE VIEW public.notes_with_tags AS
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
        FROM public.tags t
        JOIN public.note_tags nt ON t.id = nt.tag_id
        WHERE nt.note_id = n.id),
        '[]'::json
    ) as tags,
    EXISTS (
        SELECT 1 FROM public.note_attachments na WHERE na.note_id = n.id
    ) as has_attachment
FROM public.notes n
WHERE n.user_id = auth.uid();

-- Fonction RPC pour rechercher des notes
CREATE OR REPLACE FUNCTION public.search_notes(search_term TEXT)
RETURNS SETOF public.notes_with_tags
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.notes_with_tags
    WHERE 
        user_id = auth.uid() AND
        (
            title ILIKE '%' || search_term || '%' OR
            content ILIKE '%' || search_term || '%' OR
            EXISTS (
                SELECT 1 FROM public.tags t
                JOIN public.note_tags nt ON t.id = nt.tag_id
                WHERE nt.note_id = notes_with_tags.id AND t.name ILIKE '%' || search_term || '%'
            )
        )
    ORDER BY is_pinned DESC, updated_at DESC;
$$;

-- Fonction RPC pour récupérer les notes par tag
CREATE OR REPLACE FUNCTION public.get_notes_by_tag(tag_id UUID)
RETURNS SETOF public.notes_with_tags
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM public.notes_with_tags
    WHERE 
        user_id = auth.uid() AND
        id IN (
            SELECT note_id FROM public.note_tags
            WHERE tag_id = get_notes_by_tag.tag_id
        )
    ORDER BY is_pinned DESC, updated_at DESC;
$$;

-- Policies pour le bucket de stockage
BEGIN;
    -- Policy pour lire ses propres fichiers
    DROP POLICY IF EXISTS "Allow read own files" ON storage.objects;
    CREATE POLICY "Allow read own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'note-attachments' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.notes WHERE user_id = auth.uid()
        )
    );

    -- Policy pour insérer ses propres fichiers
    DROP POLICY IF EXISTS "Allow insert own files" ON storage.objects;
    CREATE POLICY "Allow insert own files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'note-attachments' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.notes WHERE user_id = auth.uid()
        )
    );

    -- Policy pour supprimer ses propres fichiers
    DROP POLICY IF EXISTS "Allow delete own files" ON storage.objects;
    CREATE POLICY "Allow delete own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'note-attachments' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM public.notes WHERE user_id = auth.uid()
        )
    );
COMMIT;