/*
  # Configuration du système de notes

  1. Tables
    - `notes` : Table principale pour stocker les notes des utilisateurs
    - Champs : id, user_id, title, content, created_at, updated_at
  
  2. Sécurité
    - Enable RLS sur la table notes
    - Policies pour SELECT, INSERT, UPDATE, DELETE
    - Chaque utilisateur ne peut accéder qu'à ses propres notes
  
  3. Triggers
    - Trigger pour mettre à jour automatiquement le champ updated_at
*/

-- Vérification de l'existence du type avant de le créer
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
        CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'trialing');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer la table notes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur la table notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes pour éviter les doublons
DROP POLICY IF EXISTS "Allow read own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow update own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow insert own notes" ON public.notes;
DROP POLICY IF EXISTS "Allow delete own notes" ON public.notes;

-- Créer les policies RLS
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
$$ language 'plpgsql';

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS set_updated_at ON public.notes;

-- Créer le trigger pour mettre à jour updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Créer un index sur user_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes(user_id);

-- Créer un index sur created_at pour améliorer les performances des tris
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON public.notes(created_at);