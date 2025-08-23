/*
  # Zoom Integration Tables
  
  1. New Tables
    - `user_zoom_integrations`
      - Secure storage of Zoom user data (no passwords)
      - SDK authentication tokens and user info
      
    - `meetings`
      - Meeting management with participant tracking
      - Recording and summary status
      
    - `meeting_participants`
      - Participant data for each meeting
      - Email collection for notifications
      
    - `meeting_summaries`
      - AI-generated meeting summaries
      - Action items and key points
      
    - `meeting_recordings`
      - Recording metadata and download status
      - Links to processed files
      
  2. Security
    - RLS enabled on all tables
    - User-specific data isolation
    - Secure token storage
    
  3. Indexes and Performance
    - Optimized queries for meeting management
    - Fast participant lookups
    - Efficient webhook processing
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Zoom Integrations Table
CREATE TABLE IF NOT EXISTS public.user_zoom_integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zoom_user_id text UNIQUE NOT NULL,
  zoom_email text NOT NULL,
  zoom_display_name text,
  zoom_account_id text,
  zoom_account_type text, -- 'basic', 'licensed', 'on_prem'
  authentication_method text DEFAULT 'sdk', -- 'sdk' or 'oauth' for future
  access_token_encrypted text, -- Encrypted storage
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  last_authenticated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zoom_meeting_id text UNIQUE NOT NULL,
  zoom_user_id text NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  duration integer NOT NULL, -- minutes
  timezone text DEFAULT 'UTC',
  meeting_url text NOT NULL,
  join_url text NOT NULL,
  password text,
  
  -- Meeting status
  status text DEFAULT 'scheduled', -- 'scheduled', 'started', 'ended', 'cancelled'
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  
  -- Recording and processing
  has_recording boolean DEFAULT false,
  recording_processed boolean DEFAULT false,
  summary_generated boolean DEFAULT false,
  emails_sent boolean DEFAULT false,
  
  -- Webhook tracking
  webhook_events jsonb DEFAULT '[]'::jsonb,
  last_webhook_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  FOREIGN KEY (zoom_user_id) REFERENCES public.user_zoom_integrations(zoom_user_id)
);

-- Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  
  -- Participant info
  zoom_participant_id text,
  email text NOT NULL,
  display_name text NOT NULL,
  
  -- Participation tracking
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes integer,
  
  -- Role and permissions
  is_host boolean DEFAULT false,
  is_co_host boolean DEFAULT false,
  
  -- Email notifications
  summary_email_sent boolean DEFAULT false,
  summary_email_sent_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meeting Summaries Table
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid UNIQUE NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  
  -- AI-generated content
  transcript_text text,
  summary_text text NOT NULL,
  key_points jsonb DEFAULT '[]'::jsonb,
  action_items jsonb DEFAULT '[]'::jsonb,
  decisions_made jsonb DEFAULT '[]'::jsonb,
  next_steps jsonb DEFAULT '[]'::jsonb,
  
  -- Processing metadata
  ai_model_used text,
  processing_time_seconds integer,
  confidence_score numeric(3,2), -- 0.00 to 1.00
  
  -- Email template data
  email_subject text,
  email_template_data jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meeting Recordings Table
CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  
  -- Zoom recording data
  zoom_recording_id text UNIQUE NOT NULL,
  recording_type text NOT NULL, -- 'audio_only', 'gallery_view', 'speaker_view', 'shared_screen'
  file_type text NOT NULL, -- 'mp4', 'm4a', 'txt'
  file_size bigint,
  
  -- Download and processing
  download_url text NOT NULL,
  download_url_expires_at timestamptz,
  downloaded boolean DEFAULT false,
  downloaded_at timestamptz,
  local_file_path text,
  
  -- Processing status
  processed_for_transcription boolean DEFAULT false,
  transcription_completed boolean DEFAULT false,
  transcription_file_path text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_zoom_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_zoom_integrations
CREATE POLICY "user_zoom_integrations_select" ON public.user_zoom_integrations
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "user_zoom_integrations_insert" ON public.user_zoom_integrations
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_zoom_integrations_update" ON public.user_zoom_integrations
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "user_zoom_integrations_delete" ON public.user_zoom_integrations
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- RLS Policies for meetings
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE TO public
  USING (user_id = auth.uid());

CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- RLS Policies for meeting_participants (via meeting ownership)
CREATE POLICY "meeting_participants_select" ON public.meeting_participants
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_participants_insert" ON public.meeting_participants
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_participants_update" ON public.meeting_participants
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_participants_delete" ON public.meeting_participants
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

-- Similar RLS policies for summaries and recordings
CREATE POLICY "meeting_summaries_select" ON public.meeting_summaries
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_summaries.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_summaries_insert" ON public.meeting_summaries
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_summaries.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_summaries_update" ON public.meeting_summaries
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_summaries.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_recordings_select" ON public.meeting_recordings
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_recordings.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "meeting_recordings_insert" ON public.meeting_recordings
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_recordings.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_zoom_integrations_user_id ON public.user_zoom_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zoom_integrations_zoom_user_id ON public.user_zoom_integrations(zoom_user_id);
CREATE INDEX IF NOT EXISTS idx_user_zoom_integrations_active ON public.user_zoom_integrations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_zoom_meeting_id ON public.meetings(zoom_meeting_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_processing_status ON public.meetings(has_recording, summary_generated);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON public.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_email ON public.meeting_participants(email);

CREATE INDEX IF NOT EXISTS idx_meeting_summaries_meeting_id ON public.meeting_summaries(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON public.meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_zoom_id ON public.meeting_recordings(zoom_recording_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_processing ON public.meeting_recordings(downloaded, processed_for_transcription);

-- Unique constraints
ALTER TABLE public.meeting_participants ADD CONSTRAINT unique_meeting_participant_email 
  UNIQUE (meeting_id, email);

-- Triggers for updated_at
CREATE TRIGGER update_user_zoom_integrations_updated_at
  BEFORE UPDATE ON public.user_zoom_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_participants_updated_at
  BEFORE UPDATE ON public.meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_summaries_updated_at
  BEFORE UPDATE ON public.meeting_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_recordings_updated_at
  BEFORE UPDATE ON public.meeting_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();