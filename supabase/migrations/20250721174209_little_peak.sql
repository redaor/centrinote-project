/*
  # Création de la table pour les tokens Zoom OAuth

  1. Nouvelle table
    - `zoom_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `access_token` (text, chiffré)
      - `refresh_token` (text, chiffré)
      - `expires_at` (timestamptz)
      - `scope` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `zoom_tokens`
    - Politique pour que les utilisateurs ne voient que leurs propres tokens
    - Index sur user_id pour les performances
*/

-- Créer la table zoom_tokens
CREATE TABLE IF NOT EXISTS zoom_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Activer RLS
ALTER TABLE zoom_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne voient que leurs propres tokens
CREATE POLICY "Users can manage their own Zoom tokens"
  ON zoom_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS zoom_tokens_user_id_idx ON zoom_tokens(user_id);
CREATE INDEX IF NOT EXISTS zoom_tokens_expires_at_idx ON zoom_tokens(expires_at);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_zoom_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_zoom_tokens_updated_at
  BEFORE UPDATE ON zoom_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_zoom_tokens_updated_at();