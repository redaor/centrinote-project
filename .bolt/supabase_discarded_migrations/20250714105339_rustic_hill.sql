/*
  # Nettoyage des reminders et mise en place des notes de documents

  1. Nettoyage
    - Suppression des tables, fonctions et triggers liés aux reminders
  
  2. Document Notes
    - Création de la table document_notes si elle n'existe pas
    - Mise en place des policies RLS avec auth.uid()
    - Création d'un trigger pour la mise à jour automatique de updated_at
*/

-- Création de la fonction auth.uid() si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
  ) THEN
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
      SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
    $$;
  END IF;
END
$$;

-- Nettoyage des reminders (si existants)
DROP TABLE IF EXISTS reminders;

-- Suppression des fonctions liées aux reminders (si existantes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_reminder_update') THEN
    DROP FUNCTION handle_reminder_update();
  END IF;
END
$$;

-- Création de la table document_notes si elle n'existe pas
CREATE TABLE IF NOT EXISTS document_notes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  document_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Création des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS document_notes_document_id_idx ON document_notes(document_id);
CREATE INDEX IF NOT EXISTS document_notes_user_id_idx ON document_notes(user_id);

-- Activation de RLS sur la table document_notes
ALTER TABLE document_notes ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes policies si elles existent
DROP POLICY IF EXISTS document_notes_select ON document_notes;
DROP POLICY IF EXISTS document_notes_insert ON document_notes;
DROP POLICY IF EXISTS document_notes_update ON document_notes;
DROP POLICY IF EXISTS document_notes_delete ON document_notes;

-- Création des nouvelles policies avec auth.uid()
CREATE POLICY document_notes_select ON document_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY document_notes_insert ON document_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY document_notes_update ON document_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY document_notes_delete ON document_notes
  FOR DELETE USING (user_id = auth.uid());

-- Création de la fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_document_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppression du trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_document_notes_updated_at ON document_notes;

-- Création du trigger pour mettre à jour updated_at
CREATE TRIGGER update_document_notes_updated_at
BEFORE UPDATE ON document_notes
FOR EACH ROW
EXECUTE FUNCTION update_document_notes_updated_at();