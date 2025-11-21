-- Migration pour créer les tables meeting_invitations et meeting_summaries
-- Version: 2.0 (migration complète sans n8n)
-- Created: 2025-01-31

-- Table pour les invitations de réunion
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  name TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'joined', 'bounced')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  relance_count INT DEFAULT 0,
  do_not_record BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_invite_meeting ON meeting_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_invite_token ON meeting_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invite_email ON meeting_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invite_status ON meeting_invitations(status);

-- Table pour les résumés de réunion générés par IA
CREATE TABLE IF NOT EXISTS meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID UNIQUE NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  raw_transcript TEXT,
  summary JSONB,
  markdown TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_summary_meeting ON meeting_summaries(meeting_id);
CREATE INDEX IF NOT EXISTS idx_summary_validated ON meeting_summaries(validated_by);

-- RLS pour meeting_invitations
ALTER TABLE meeting_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their meetings" ON meeting_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = meeting_invitations.meeting_id 
      AND meetings.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role can manage invitations" ON meeting_invitations
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS pour meeting_summaries
ALTER TABLE meeting_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view summaries for their meetings" ON meeting_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = meeting_summaries.meeting_id 
      AND meetings.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role can manage summaries" ON meeting_summaries
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Triggers pour updated_at
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE
    ON meeting_invitations FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE
    ON meeting_summaries FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Fonction pour générer un token unique
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Ajouter colonne preferences à auth.users si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'preferences'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN preferences JSONB DEFAULT '{}';
  END IF;
END $$;

