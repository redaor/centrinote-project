# CRITICAL: Zoom Database Setup Instructions

## ⚠️ IMMEDIATE ACTION REQUIRED

The error `relation 'public.zoom_user_connections' does not exist` means the database tables haven't been created. Follow these steps exactly:

## Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/projects
2. Select your project: `centrinote-project`
3. Navigate to **SQL Editor** in the left sidebar

## Step 2: Run the Complete Migration Script

1. In the SQL Editor, click **New Query**
2. Copy the **ENTIRE CONTENTS** of `ZOOM_DATABASE_SETUP.sql`
3. Paste it into the SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

## Step 3: Verify Tables Were Created

After running the script, execute this verification query:

```sql
-- Check if all tables exist
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'zoom_%'
ORDER BY table_name;
```

**Expected Result**: You should see 3 tables:
- `zoom_user_connections`
- `zoom_meetings` 
- `zoom_meeting_participants`

## Step 4: Test Basic Operations

Run these test queries to ensure everything works:

```sql
-- Test 1: Count records (should be 0 initially)
SELECT COUNT(*) as user_connections_count FROM public.zoom_user_connections;

-- Test 2: Check RLS policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'zoom_%'
ORDER BY tablename;

-- Test 3: Test insert operation (should work without errors)
-- Replace 'your-user-id' with your actual user ID
INSERT INTO public.zoom_user_connections (
  user_id,
  zoom_user_id,
  zoom_email,
  zoom_display_name
) VALUES (
  auth.uid(),  -- This should get your current user ID
  'test_user_123',
  'test@example.com',
  'Test User'
) ON CONFLICT (user_id) DO UPDATE SET
  zoom_email = EXCLUDED.zoom_email,
  updated_at = now();

-- Test 4: Verify the test record was created
SELECT * FROM public.zoom_user_connections WHERE zoom_email = 'test@example.com';

-- Test 5: Clean up test record
DELETE FROM public.zoom_user_connections WHERE zoom_email = 'test@example.com';
```

## Step 5: Restart Your Application

1. Stop your development server (Ctrl+C)
2. Restart it: `npm run dev`
3. Navigate to the Zoom section
4. Check the debug panel (bug icon) - Database Connection should now show green ✅

## Troubleshooting

### If Script Fails:

1. **Permission Error**: Make sure you're the project owner or have admin access
2. **UUID Extension Error**: Run this first:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. **Auth Schema Error**: Ensure you're using Supabase Auth (not custom auth)

### If Tables Still Don't Exist:

1. Check the Query Results panel for error messages
2. Try running each section of the script separately
3. Verify you're in the correct Supabase project

### Common Issues:

1. **"auth.uid() is null"**: You need to be authenticated when testing
2. **"permission denied"**: RLS policies are working correctly
3. **"relation already exists"**: Safe to ignore, script uses IF NOT EXISTS

## Manual Table Creation (If Script Fails)

If the complete script fails, create tables individually:

### 1. zoom_user_connections table:
```sql
CREATE TABLE public.zoom_user_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zoom_user_id text NOT NULL,
  zoom_email text NOT NULL,
  zoom_display_name text,
  zoom_account_id text,
  is_active boolean DEFAULT true,
  last_connected_at timestamptz DEFAULT now(),
  disconnected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.zoom_user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoom_user_connections_own_data" ON public.zoom_user_connections
  FOR ALL USING (user_id = auth.uid());
```

### 2. zoom_meetings table:
```sql
CREATE TABLE public.zoom_meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_id text NOT NULL,
  meeting_number text NOT NULL,
  topic text NOT NULL,
  start_time timestamptz NOT NULL,
  duration integer DEFAULT 30,
  join_url text NOT NULL,
  start_url text,
  password text,
  status text DEFAULT 'scheduled',
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  sdk_signature text,
  last_joined_at timestamptz,
  has_recording boolean DEFAULT false,
  recording_processed boolean DEFAULT false,
  summary_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoom_meetings_own_data" ON public.zoom_meetings
  FOR ALL USING (user_id = auth.uid());
```

### 3. zoom_meeting_participants table:
```sql
CREATE TABLE public.zoom_meeting_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.zoom_meetings(id) ON DELETE CASCADE,
  zoom_participant_id text,
  email text NOT NULL,
  display_name text NOT NULL,
  joined_at timestamptz,
  left_at timestamptz,
  duration_minutes integer,
  is_host boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, email)
);

ALTER TABLE public.zoom_meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoom_meeting_participants_via_meeting" ON public.zoom_meeting_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.zoom_meetings m 
      WHERE m.id = zoom_meeting_participants.meeting_id 
      AND m.user_id = auth.uid()
    )
  );
```

## Verification Checklist

After setup, verify:

- [ ] All 3 tables exist in Supabase
- [ ] RLS policies are enabled 
- [ ] Insert/Select operations work
- [ ] Debug panel shows Database Connection ✅
- [ ] Zoom connection modal no longer shows database errors
- [ ] Application console shows successful database test

## Next Steps

Once tables are created:

1. Try connecting to Zoom again
2. Check debug panel for status
3. Test creating a meeting
4. Verify data appears in Supabase tables

The database setup is now complete and the Zoom connection should work!