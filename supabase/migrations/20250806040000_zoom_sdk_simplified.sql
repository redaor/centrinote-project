/*
  # Simplified Zoom SDK Integration Tables
  
  This migration creates simplified tables for the Meeting SDK approach:
  
  1. New Tables
    - `zoom_user_connections` - Simple user-zoom connections (no OAuth tokens)
    - `zoom_meetings` - Meeting data with SDK focus
    
  2. Removes OAuth complexity
    - No token storage
    - No refresh mechanisms
    - Simple user identification
    
  3. Security
    - RLS enabled
    - Only stores public Zoom user info
    - No sensitive credentials
*/

-- Create simplified zoom user connections table
CREATE TABLE IF NOT EXISTS public.zoom_user_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Zoom user info (public data only)
  zoom_user_id text NOT NULL,
  zoom_email text NOT NULL,
  zoom_display_name text,
  zoom_account_id text,
  
  -- Connection tracking
  is_active boolean DEFAULT true,
  last_connected_at timestamptz DEFAULT now(),
  disconnected_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create simplified zoom meetings table
CREATE TABLE IF NOT EXISTS public.zoom_meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Zoom meeting info
  meeting_id text NOT NULL, -- Zoom's meeting ID
  meeting_number text NOT NULL, -- The number users dial to join
  topic text NOT NULL,
  
  -- Meeting details
  start_time timestamptz NOT NULL,
  duration integer DEFAULT 30, -- minutes
  join_url text NOT NULL,
  start_url text, -- For hosts
  password text,
  
  -- Meeting status
  status text DEFAULT 'scheduled', -- 'scheduled', 'started', 'ended', 'cancelled'
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  
  -- SDK-specific data
  sdk_signature text, -- Last generated signature for this meeting
  last_joined_at timestamptz,
  
  -- Processing flags
  has_recording boolean DEFAULT false,
  recording_processed boolean DEFAULT false,
  summary_generated boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meeting participants table (simplified)
CREATE TABLE IF NOT EXISTS public.zoom_meeting_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.zoom_meetings(id) ON DELETE CASCADE,
  
  -- Participant info
  zoom_participant_id text,
  email text NOT NULL,
  display_name text NOT NULL,
  
  -- Participation tracking
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes integer,
  
  -- Role
  is_host boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  -- Unique participant per meeting
  UNIQUE(meeting_id, email)
);

-- Enable RLS
ALTER TABLE public.zoom_user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zoom_user_connections
CREATE POLICY "zoom_user_connections_own_data" ON public.zoom_user_connections
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for zoom_meetings
CREATE POLICY "zoom_meetings_own_data" ON public.zoom_meetings
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for zoom_meeting_participants
CREATE POLICY "zoom_meeting_participants_via_meeting" ON public.zoom_meeting_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.zoom_meetings m 
      WHERE m.id = zoom_meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_user_id ON public.zoom_user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_zoom_user_id ON public.zoom_user_connections(zoom_user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_active ON public.zoom_user_connections(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_zoom_meetings_user_id ON public.zoom_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_meeting_id ON public.zoom_meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_meeting_number ON public.zoom_meetings(meeting_number);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_status ON public.zoom_meetings(status);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_start_time ON public.zoom_meetings(start_time);

CREATE INDEX IF NOT EXISTS idx_zoom_meeting_participants_meeting_id ON public.zoom_meeting_participants(meeting_id);

-- Update triggers
CREATE TRIGGER update_zoom_user_connections_updated_at
  BEFORE UPDATE ON public.zoom_user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_meetings_updated_at
  BEFORE UPDATE ON public.zoom_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Functions for meeting management
CREATE OR REPLACE FUNCTION get_user_zoom_connection(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(zuc.*) INTO result
  FROM public.zoom_user_connections zuc
  WHERE zuc.user_id = p_user_id AND zuc.is_active = true;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_zoom_meetings(
  p_user_id uuid DEFAULT auth.uid(),
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', zm.id,
      'meeting_id', zm.meeting_id,
      'meeting_number', zm.meeting_number,
      'topic', zm.topic,
      'start_time', zm.start_time,
      'duration', zm.duration,
      'join_url', zm.join_url,
      'status', zm.status,
      'has_recording', zm.has_recording,
      'participant_count', COALESCE(zm.participant_count, 0),
      'created_at', zm.created_at
    ) ORDER BY zm.start_time DESC
  ) INTO result
  FROM (
    SELECT 
      zm.*,
      COUNT(zmp.id) as participant_count
    FROM public.zoom_meetings zm
    LEFT JOIN public.zoom_meeting_participants zmp ON zm.id = zmp.meeting_id
    WHERE zm.user_id = p_user_id
    GROUP BY zm.id
    ORDER BY zm.start_time DESC
    LIMIT p_limit
  ) zm;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_zoom_connection TO public;
GRANT EXECUTE ON FUNCTION get_user_zoom_meetings TO public;