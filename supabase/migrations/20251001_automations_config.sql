-- Migration pour personnalisation des automatisations
-- Créé le 2025-10-01

-- Table pour stocker les configurations d'automatisations personnalisées
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  automation_type TEXT NOT NULL CHECK (automation_type IN (
    'daily_review',
    'vocab_milestone', 
    'forgotten_notes',
    'study_reminder',
    'weekly_summary',
    'monthly_report'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique par utilisateur et type d'automatisation
  UNIQUE(user_id, automation_type)
);

-- Table pour logs d'exécution et idempotence
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  automation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index pour performances
  INDEX idx_automation_logs_idempotency ON automation_logs(idempotency_key),
  INDEX idx_automation_logs_user_type ON automation_logs(user_id, automation_type),
  INDEX idx_automation_logs_executed ON automation_logs(executed_at)
);

-- RLS (Row Level Security)
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour automations
CREATE POLICY "Users can view their own automations" 
  ON automations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automations" 
  ON automations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automations" 
  ON automations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automations" 
  ON automations FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies pour automation_logs
CREATE POLICY "Users can view their own automation logs" 
  ON automation_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all automation logs" 
  ON automation_logs FOR ALL 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automations_updated_at 
  BEFORE UPDATE ON automations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données par défaut pour chaque type d'automatisation
INSERT INTO automations (user_id, automation_type, config) 
SELECT 
  auth.uid(),
  automation_type,
  default_config
FROM (
  VALUES 
    ('daily_review', '{"active": true, "time": "09:00", "days_of_week": [1,2,3,4,5,6,7]}'),
    ('vocab_milestone', '{"active": true, "thresholds": [50,100,200], "celebrate_mastery": true}'),
    ('forgotten_notes', '{"active": true, "after_days": 7, "max_notes": 3}'),
    ('study_reminder', '{"active": true, "time": "18:00", "days_of_week": [1,2,3,4,5]}'),
    ('weekly_summary', '{"active": true, "day_of_week": 5, "time": "17:00"}'),
    ('monthly_report', '{"active": true, "day_of_month": 1, "time": "08:00"}')
) AS defaults(automation_type, default_config)
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, automation_type) DO NOTHING;

COMMENT ON TABLE automations IS 'Configuration personnalisée des automatisations par utilisateur';
COMMENT ON TABLE automation_logs IS 'Logs d\'exécution des automatisations avec idempotence';