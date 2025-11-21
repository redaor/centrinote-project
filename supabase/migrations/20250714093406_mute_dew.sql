/*
  # Création de la table document_notes

  1. Nouvelle Table
    - `document_notes`
      - `id` (bigint, clé primaire)
      - `document_id` (text, non null)
      - `user_id` (uuid, non null, référence à auth.users)
      - `content` (text, non null)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      - `updated_at` (timestamp with time zone, valeur par défaut now())
  
  2. Sécurité
    - Activation de RLS sur la table document_notes
    - Policies pour permettre aux utilisateurs de gérer uniquement leurs propres notes
*/

-- Créer la table document_notes
CREATE TABLE IF NOT EXISTS public.document_notes (
  id bigint PRIMARY KEY,
  document_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.document_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "document_notes_select" ON public.document_notes
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "document_notes_insert" ON public.document_notes
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "document_notes_update" ON public.document_notes
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "document_notes_delete" ON public.document_notes
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- Trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_document_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_notes_updated_at
BEFORE UPDATE ON public.document_notes
FOR EACH ROW
EXECUTE FUNCTION update_document_notes_updated_at();