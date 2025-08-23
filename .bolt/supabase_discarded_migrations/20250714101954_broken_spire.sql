/*
  # Création de la table document_notes

  1. Nouvelle Table
    - `document_notes`
      - `id` (bigint, primary key)
      - `document_id` (text, non-null)
      - `user_id` (uuid, non-null, référence vers users.id)
      - `content` (text, non-null)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `document_notes` table
    - Add policies for CRUD operations (select, insert, update, delete)
    - Trigger pour mise à jour automatique de updated_at
*/

-- Créer la table document_notes
CREATE TABLE IF NOT EXISTS document_notes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  document_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE document_notes ENABLE ROW LEVEL SECURITY;

-- Créer les policies RLS
CREATE POLICY "document_notes_select" ON document_notes
  FOR SELECT USING (user_id = uid());

CREATE POLICY "document_notes_insert" ON document_notes
  FOR INSERT WITH CHECK (user_id = uid());

CREATE POLICY "document_notes_update" ON document_notes
  FOR UPDATE USING (user_id = uid());

CREATE POLICY "document_notes_delete" ON document_notes
  FOR DELETE USING (user_id = uid());

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_document_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_notes_updated_at
BEFORE UPDATE ON document_notes
FOR EACH ROW
EXECUTE FUNCTION update_document_notes_updated_at();

-- Créer un index sur document_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS document_notes_document_id_idx ON document_notes(document_id);

-- Créer un index sur user_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS document_notes_user_id_idx ON document_notes(user_id);