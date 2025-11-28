-- ============================================
-- Table tasks pour le planning
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('study', 'meeting', 'review', 'break', 'personal')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  completed BOOLEAN DEFAULT FALSE,
  reminder BOOLEAN DEFAULT FALSE,
  recurring TEXT CHECK (recurring IN ('daily', 'weekly', 'monthly') OR recurring IS NULL),
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_start_time_idx ON tasks(start_time);
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON tasks(completed);

-- RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy pour lire ses propres tâches
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy pour créer ses propres tâches
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy pour modifier ses propres tâches
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy pour supprimer ses propres tâches
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
