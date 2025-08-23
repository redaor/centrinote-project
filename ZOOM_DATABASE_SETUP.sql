/*
  CRITICAL: Zoom Database Tables Setup
  
  Run this COMPLETE script in Supabase SQL Editor to create all required tables.
  This will fix the "relation public.zoom_user_connections does not exist" error.
*/

-- =====================================================================
-- STEP 1: Create the update_updated_at_column function (if not exists)
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================================
-- STEP 2: Create zoom_user_connections table
-- =====================================================================

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

-- =====================================================================
-- STEP 3: Create zoom_meetings table
-- =====================================================================

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

-- =====================================================================
-- STEP 4: Create zoom_meeting_participants table
-- =====================================================================

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

-- =====================================================================
-- STEP 5: Enable Row Level Security (RLS)
-- =====================================================================

ALTER TABLE public.zoom_user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meeting_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 6: Create RLS Policies
-- =====================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "zoom_user_connections_own_data" ON public.zoom_user_connections;
DROP POLICY IF EXISTS "zoom_meetings_own_data" ON public.zoom_meetings;
DROP POLICY IF EXISTS "zoom_meeting_participants_via_meeting" ON public.zoom_meeting_participants;

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

-- =====================================================================
-- STEP 7: Create Indexes for Performance
-- =====================================================================

-- Indexes for zoom_user_connections
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_user_id 
  ON public.zoom_user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_zoom_user_id 
  ON public.zoom_user_connections(zoom_user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_user_connections_active 
  ON public.zoom_user_connections(is_active) WHERE is_active = true;

-- Indexes for zoom_meetings
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_user_id 
  ON public.zoom_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_meeting_id 
  ON public.zoom_meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_meeting_number 
  ON public.zoom_meetings(meeting_number);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_status 
  ON public.zoom_meetings(status);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_start_time 
  ON public.zoom_meetings(start_time);

-- Indexes for zoom_meeting_participants
CREATE INDEX IF NOT EXISTS idx_zoom_meeting_participants_meeting_id 
  ON public.zoom_meeting_participants(meeting_id);

-- =====================================================================
-- STEP 8: Create Update Triggers
-- =====================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_zoom_user_connections_updated_at ON public.zoom_user_connections;
DROP TRIGGER IF EXISTS update_zoom_meetings_updated_at ON public.zoom_meetings;

-- Create update triggers
CREATE TRIGGER update_zoom_user_connections_updated_at
  BEFORE UPDATE ON public.zoom_user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zoom_meetings_updated_at
  BEFORE UPDATE ON public.zoom_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- STEP 9: Create Helper Functions
-- =====================================================================

-- Function to get user's Zoom connection
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

-- Function to get user's Zoom meetings
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

-- =====================================================================
-- STEP 10: Grant Permissions
-- =====================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_zoom_connection TO public;
GRANT EXECUTE ON FUNCTION get_user_zoom_meetings TO public;

-- =====================================================================
-- STEP 11: Verification Queries (Run these to test)
-- =====================================================================

-- Test 1: Check if tables exist
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'zoom_%'
ORDER BY table_name;

-- Test 2: Check table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('zoom_user_connections', 'zoom_meetings', 'zoom_meeting_participants')
ORDER BY table_name, ordinal_position;

-- Test 3: Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename LIKE 'zoom_%'
ORDER BY tablename, policyname;

-- Test 4: Test basic operations (will be empty initially)
SELECT COUNT(*) as user_connections_count FROM public.zoom_user_connections;
SELECT COUNT(*) as meetings_count FROM public.zoom_meetings;
SELECT COUNT(*) as participants_count FROM public.zoom_meeting_participants;