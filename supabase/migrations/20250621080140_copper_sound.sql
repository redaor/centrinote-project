/*
  # Schéma pour les automatisations

  1. Nouvelles Tables
    - `automations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence à auth.users)
      - `name` (text)
      - `description` (text)
      - `trigger_type` (text)
      - `trigger_config` (jsonb)
      - `action_type` (text)
      - `action_config` (jsonb)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_executed_at` (timestamptz)
      - `execution_count` (integer)
    
    - `automation_logs`
      - `id` (uuid, primary key)
      - `automation_id` (uuid, référence à automations)
      - `executed_at` (timestamptz)
      - `status` (text)
      - `trigger_data` (jsonb)
      - `action_result` (jsonb)
      - `error_message` (text)

  2. Sécurité
    - Enable RLS sur les deux tables
    - Politiques pour que les utilisateurs puissent gérer leurs propres automatisations
    - Politiques pour que les utilisateurs puissent voir leurs propres logs

  3. Indexation
    - Index sur user_id, trigger_type, is_active pour automations
    - Index sur automation_id, executed_at pour automation_logs
*/

-- Table des automatisations
CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'document_created',
    'document_updated', 
    'vocabulary_added',
    'vocabulary_mastered',
    'study_session_completed',
    'schedule_time',
    'collaboration_invite'
  )),
  trigger_config jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL CHECK (action_type IN (
    'create_reminder',
    'send_notification',
    'create_study_session',
    'update_document_tags',
    'share_document',
    'create_vocabulary_review',
    'send_email',
    'create_task'
  )),
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_executed_at timestamptz,
  execution_count integer DEFAULT 0
);

-- Table des logs d'exécution
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  trigger_data jsonb DEFAULT '{}',
  action_result jsonb DEFAULT '{}',
  error_message text
);

-- Enable RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour automations
CREATE POLICY "Users can manage their own automations"
  ON automations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Politiques pour automation_logs
CREATE POLICY "Users can view their own automation logs"
  ON automation_logs
  FOR SELECT
  TO authenticated
  USING (
    automation_id IN (
      SELECT id FROM automations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert automation logs"
  ON automation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    automation_id IN (
      SELECT id FROM automations WHERE user_id = auth.uid()
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS automations_user_id_idx ON automations(user_id);
CREATE INDEX IF NOT EXISTS automations_trigger_type_idx ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS automations_is_active_idx ON automations(is_active);
CREATE INDEX IF NOT EXISTS automation_logs_automation_id_idx ON automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS automation_logs_executed_at_idx ON automation_logs(executed_at);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();