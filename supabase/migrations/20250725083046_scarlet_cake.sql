/*
  # Create config table for application settings

  1. New Tables
    - `config`
      - `key` (text, primary key) - Configuration key identifier
      - `value` (text) - Configuration value
      - `description` (text, optional) - Human-readable description
      - `is_public` (boolean) - Whether this config is publicly accessible
      - `created_at` (timestamp) - When the config was created
      - `updated_at` (timestamp) - When the config was last updated

  2. Security
    - Enable RLS on `config` table
    - Add policy for service role to manage all configs
    - Add policy for authenticated users to read public configs

  3. Initial Data
    - Insert default webhook URL configuration
*/

CREATE TABLE IF NOT EXISTS config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage all configs
CREATE POLICY "Service role can manage all configs"
  ON config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users to read public configs
CREATE POLICY "Authenticated users can read public configs"
  ON config
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Insert default webhook URL
INSERT INTO config (key, value, description, is_public) 
VALUES (
  'webhook_url',
  'https://n8n.srv886297.hstgr.cloud/webhook/analyse-agent-ia',
  'URL du webhook N8N pour les automatisations et l''analyse IA',
  false
) ON CONFLICT (key) DO NOTHING;