-- =====================================================
-- AUTOMATION EDGE MIGRATION
-- Setup for autonomous automation system
-- =====================================================

-- =====================================================
-- 1. ENABLE PG_CRON EXTENSION
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- =====================================================
-- 2. CREATE/UPDATE AUTOMATION TABLES
-- =====================================================

-- Automation templates table (must be created first)
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  trigger_schema JSONB NOT NULL DEFAULT '{}',
  action_schema JSONB NOT NULL DEFAULT '{}',
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to automation_templates if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_templates' AND column_name = 'category'
  ) THEN
    ALTER TABLE automation_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;
END $$;

-- Automations table (ensure it exists with all required fields)
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES automation_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',

  -- Action configuration
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',

  -- Conditions and scheduling
  conditions JSONB DEFAULT '[]',
  schedule_config JSONB DEFAULT '{}',

  -- Retry configuration
  retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 60, "backoff_multiplier": 2}',

  -- Status and metrics
  is_active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 5,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ
);

-- Add missing columns to automations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'category'
  ) THEN
    ALTER TABLE automations ADD COLUMN category TEXT NOT NULL DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'retry_config'
  ) THEN
    ALTER TABLE automations ADD COLUMN retry_config JSONB DEFAULT '{"max_retries": 3, "retry_delay": 60, "backoff_multiplier": 2}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'next_execution_at'
  ) THEN
    ALTER TABLE automations ADD COLUMN next_execution_at TIMESTAMPTZ;
  END IF;
END $$;

-- Automation executions table
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending',
  trigger_data JSONB NOT NULL DEFAULT '{}',
  action_result JSONB,
  error_message TEXT,

  -- Performance metrics
  execution_time_ms INTEGER,
  memory_usage_mb FLOAT,

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  is_retry BOOLEAN DEFAULT false,
  parent_execution_id UUID REFERENCES automation_executions(id),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled', 'timeout'))
);

-- Notifications table for automation notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  priority TEXT DEFAULT 'normal',

  -- Action and metadata
  action_url TEXT,
  metadata JSONB DEFAULT '{}',

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_type CHECK (type IN ('info', 'success', 'warning', 'error')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Push tokens table (for mobile push notifications)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,

  CONSTRAINT valid_platform CHECK (platform IN ('ios', 'android', 'web', 'expo'))
);

-- Automation analytics table
CREATE TABLE IF NOT EXISTS automation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  executions_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(automation_id, date)
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON automation_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_premium ON automation_templates(is_premium);

-- Automations indexes
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON automations(is_active);
CREATE INDEX IF NOT EXISTS idx_automations_next_execution ON automations(next_execution_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_category ON automations(category);

-- Executions indexes
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON automation_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_parent_id ON automation_executions(parent_execution_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Push tokens indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_is_active ON push_tokens(is_active);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_automation_id ON automation_analytics(automation_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON automation_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON automation_analytics(user_id);

-- =====================================================
-- 4. CREATE USER PROFILES TABLE (if not exists)
-- =====================================================

-- Create user_profiles table to store additional user data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unread_notifications INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- =====================================================
-- 5. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to automations
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to push_tokens
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. SETUP ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_analytics ENABLE ROW LEVEL SECURITY;

-- Templates policies (public read access)
DROP POLICY IF EXISTS "Templates are publicly readable" ON automation_templates;
CREATE POLICY "Templates are publicly readable"
  ON automation_templates FOR SELECT
  TO authenticated
  USING (true);

-- Automations policies
DROP POLICY IF EXISTS "Users can view their own automations" ON automations;
CREATE POLICY "Users can view their own automations"
  ON automations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own automations" ON automations;
CREATE POLICY "Users can create their own automations"
  ON automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own automations" ON automations;
CREATE POLICY "Users can update their own automations"
  ON automations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own automations" ON automations;
CREATE POLICY "Users can delete their own automations"
  ON automations FOR DELETE
  USING (auth.uid() = user_id);

-- Execution policies
DROP POLICY IF EXISTS "Users can view their automation executions" ON automation_executions;
CREATE POLICY "Users can view their automation executions"
  ON automation_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM automations
      WHERE automations.id = automation_executions.automation_id
      AND automations.user_id = auth.uid()
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Push tokens policies
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON push_tokens;
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Analytics policies
DROP POLICY IF EXISTS "Users can view their own analytics" ON automation_analytics;
CREATE POLICY "Users can view their own analytics"
  ON automation_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. SETUP PG_CRON JOBS
-- =====================================================

-- Remove existing jobs if any (ignore errors if they don't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('automation-scheduler-every-5min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('automation-scheduler-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('automation-cleanup-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule automation-scheduler Edge Function to run every hour
-- NOUVELLE LOGIQUE : Le scheduler vérifie toutes les heures si c'est l'heure locale
SELECT cron.schedule(
  'automation-scheduler-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-scheduler',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'scheduled_by', 'pg_cron',
        'timestamp', NOW()
      )
    ) AS request_id;
  $$
);

-- Backup scheduler every 5 minutes (pour les automations sans user_local_time)
SELECT cron.schedule(
  'automation-scheduler-every-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/automation-scheduler',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'scheduled_by', 'pg_cron_hourly',
        'timestamp', NOW()
      )
    ) AS request_id;
  $$
);

-- Daily cleanup job - delete old execution records (older than 30 days)
SELECT cron.schedule(
  'automation-cleanup-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  DELETE FROM automation_executions
  WHERE completed_at < NOW() - INTERVAL '30 days';
  $$
);

-- =====================================================
-- 8. SETUP CONFIGURATION PARAMETERS
-- =====================================================

-- Store Supabase configuration for pg_cron jobs
-- These need to be set manually in Supabase Dashboard → Database → Settings
-- Or via SQL:

-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://wjzlicokhxitmeoxkjzv.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';

-- Note: In production, set these via Supabase Dashboard:
-- Settings → Database → Custom Postgres Configuration

-- =====================================================
-- 9. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();

  -- Create profile if it doesn't exist, then update
  INSERT INTO user_profiles (id, unread_notifications)
  VALUES (auth.uid(), 0)
  ON CONFLICT (id) DO UPDATE
  SET unread_notifications = GREATEST(user_profiles.unread_notifications - 1, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;

  -- Create profile if it doesn't exist, then update
  INSERT INTO user_profiles (id, unread_notifications)
  VALUES (auth.uid(), 0)
  ON CONFLICT (id) DO UPDATE
  SET unread_notifications = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get automation statistics
CREATE OR REPLACE FUNCTION get_automation_stats(p_user_id UUID)
RETURNS TABLE (
  total_automations BIGINT,
  active_automations BIGINT,
  total_executions BIGINT,
  success_rate NUMERIC,
  avg_execution_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_automations,
    COUNT(*) FILTER (WHERE is_active = true)::BIGINT AS active_automations,
    COALESCE(SUM(execution_count), 0)::BIGINT AS total_executions,
    CASE
      WHEN SUM(execution_count) > 0
      THEN ROUND((SUM(success_count)::NUMERIC / SUM(execution_count)::NUMERIC) * 100, 1)
      ELSE 0
    END AS success_rate,
    COALESCE(
      (SELECT AVG(execution_time_ms)::INTEGER
       FROM automation_executions ae
       JOIN automations a ON ae.automation_id = a.id
       WHERE a.user_id = p_user_id AND ae.status = 'success'
       AND ae.started_at > NOW() - INTERVAL '7 days'),
      0
    ) AS avg_execution_time
  FROM automations
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_stats TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Automation Edge Migration Complete';
  RAISE NOTICE '📊 Tables created/updated: automations, automation_executions, notifications, push_tokens, automation_analytics';
  RAISE NOTICE '⏰ pg_cron jobs scheduled';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '📝 Remember to set configuration parameters in Supabase Dashboard';
END $$;
