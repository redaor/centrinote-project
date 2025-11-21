-- =====================================================
-- CREATE STUDY_SESSIONS TABLE
-- Table pour stocker les sessions d'étude planifiées
-- =====================================================

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session details
  session_type VARCHAR(50) NOT NULL, -- 'vocabulary', 'document', 'mixed', 'review'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,

  -- Scheduling
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Automation
  created_by_automation BOOLEAN DEFAULT FALSE,
  automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  items_completed INTEGER DEFAULT 0,
  items_total INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_for ON study_sessions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_automation ON study_sessions(automation_id) WHERE automation_id IS NOT NULL;

-- RLS Policies
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own study sessions"
  ON study_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can create own study sessions"
  ON study_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own study sessions"
  ON study_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own study sessions"
  ON study_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_study_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER study_sessions_updated_at
  BEFORE UPDATE ON study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_study_sessions_updated_at();

-- Comments
COMMENT ON TABLE study_sessions IS 'Sessions d''étude planifiées par les utilisateurs ou les automatisations';
COMMENT ON COLUMN study_sessions.session_type IS 'Type de session: vocabulary, document, mixed, review';
COMMENT ON COLUMN study_sessions.status IS 'Statut: scheduled, in_progress, completed, cancelled';
COMMENT ON COLUMN study_sessions.created_by_automation IS 'TRUE si créée par une automatisation';
COMMENT ON COLUMN study_sessions.progress IS 'Progression en pourcentage (0-100)';
