-- Migration pour créer la table meetings pour Daily.co
-- Created: 2025-01-19

-- Table pour les réunions Daily.co
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Daily.co fields
  room_name TEXT UNIQUE NOT NULL,
  room_url TEXT NOT NULL,
  
  -- Meeting info
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Participants
  participants JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Recording
  recording_url TEXT,
  recording_id TEXT,
  transcript TEXT,
  ai_summary JSONB,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_room_name ON meetings(room_name);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings(created_by);

-- RLS (Row Level Security)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policies RLS
CREATE POLICY "Users can view their own meetings" ON meetings
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create their own meetings" ON meetings
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meetings" ON meetings
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own meetings" ON meetings
  FOR DELETE USING (created_by = auth.uid());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE
    ON meetings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Fonction pour nettoyer les anciennes réunions
CREATE OR REPLACE FUNCTION cleanup_old_meetings()
RETURNS void AS $$
BEGIN
    -- Marquer comme terminées les réunions actives depuis plus de 4h
    UPDATE meetings 
    SET status = 'completed', ended_at = NOW()
    WHERE status = 'active' 
    AND started_at < NOW() - INTERVAL '4 hours';
    
    -- Supprimer les réunions annulées de plus de 30 jours
    DELETE FROM meetings 
    WHERE status = 'cancelled' 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;