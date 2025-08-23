/*
  # Automatisation des tâches - Tables et sécurité

  1. Nouvelles tables
    - `automations` - Stocke les automatisations créées par les utilisateurs
    - `automation_logs` - Historique d'exécution des automatisations

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour que les utilisateurs ne voient que leurs propres données
    - Index pour optimiser les performances

  3. Fonctionnalités
    - Déclencheurs configurables (création document, vocabulaire maîtrisé, etc.)
    - Actions automatisées (créer rappel, envoyer notification, etc.)
    - Suivi des exécutions avec logs détaillés
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
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();