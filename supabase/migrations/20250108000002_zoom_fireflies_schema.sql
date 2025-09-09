-- ==========================================
-- SCHÉMA ZOOM FIREFLIES-LIKE COMPLET
-- ==========================================

-- Table pour les enregistrements Zoom
CREATE TABLE IF NOT EXISTS zoom_recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id bigint NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recording_url text,
  download_url text,
  file_size bigint,
  duration integer, -- en secondes
  recording_type text DEFAULT 'cloud', -- cloud, local
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'downloaded', 'failed')),
  transcription text,
  transcription_status text DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ajouter colonnes manquantes à zoom_meetings
ALTER TABLE zoom_meetings 
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS ended_at timestamptz,
ADD COLUMN IF NOT EXISTS recording_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_recording text DEFAULT 'none' CHECK (auto_recording IN ('none', 'local', 'cloud'));

-- Table pour les participants des meetings
CREATE TABLE IF NOT EXISTS zoom_meeting_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id bigint NOT NULL,
  user_id text, -- Zoom user ID
  user_name text,
  email text,
  join_time timestamptz,
  leave_time timestamptz,
  duration integer, -- en secondes
  created_at timestamptz DEFAULT now()
);

-- Table pour les webhooks Zoom reçus (debug/audit)
CREATE TABLE IF NOT EXISTS zoom_webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  meeting_id bigint,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processing_error text,
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_meeting_id ON zoom_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_zoom_recordings_user_id ON zoom_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meeting_participants_meeting_id ON zoom_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_zoom_webhook_events_event_type ON zoom_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_zoom_webhook_events_created_at ON zoom_webhook_events(created_at);

-- RLS Policies
ALTER TABLE zoom_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy pour zoom_recordings
CREATE POLICY "Users can access own recordings"
  ON zoom_recordings
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() 
    AND public.user_email_verified()
  )
  WITH CHECK (
    user_id = auth.uid() 
    AND public.user_email_verified()
  );

-- Policy pour zoom_meeting_participants  
CREATE POLICY "Users can access participants from their meetings"
  ON zoom_meeting_participants
  FOR ALL
  TO authenticated
  USING (
    meeting_id IN (
      SELECT meeting_id FROM zoom_meetings 
      WHERE user_id = auth.uid()
    )
    AND public.user_email_verified()
  );

-- Policy pour zoom_webhook_events (admin only)
CREATE POLICY "Admin can access webhook events"
  ON zoom_webhook_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );