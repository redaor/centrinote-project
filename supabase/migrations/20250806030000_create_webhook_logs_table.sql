/*
  # Webhook Logs Table
  
  This migration creates a table to track all webhook events for debugging and monitoring.
  
  1. New Tables
    - `webhook_logs`
      - Logs all webhook events (Zoom, N8N, etc.)
      - Includes payload, response, and status
      - Helps with debugging webhook issues
      
  2. Security
    - RLS enabled with user-specific access
    - Service role can read all logs for monitoring
    
  3. Performance
    - Indexes for efficient querying
    - Automatic cleanup of old logs (30 days)
*/

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Webhook information
  webhook_type text NOT NULL, -- 'zoom', 'n8n', 'stripe', etc.
  endpoint text NOT NULL,
  event_type text NOT NULL,
  
  -- Request/Response data
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb,
  
  -- Status
  success boolean DEFAULT true,
  error_message text,
  http_status integer,
  processing_time_ms integer,
  
  -- Metadata
  source_ip text,
  user_agent text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  
  -- Optional associations
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  automation_id uuid -- For future automation system
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_logs
CREATE POLICY "webhook_logs_select" ON public.webhook_logs
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "webhook_logs_insert" ON public.webhook_logs
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL); -- Allow service role inserts

-- Service role can read all logs for monitoring
CREATE POLICY "service_role_webhook_logs" ON public.webhook_logs
  FOR ALL TO service_role
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_type ON public.webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON public.webhook_logs(success) WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_meeting_id ON public.webhook_logs(meeting_id) WHERE meeting_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_type_date ON public.webhook_logs(user_id, webhook_type, created_at DESC);

-- Function to automatically clean up old webhook logs
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete logs older than 30 days
  DELETE FROM public.webhook_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up old webhook logs older than 30 days';
END;
$$;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- This would be set up separately in production
-- SELECT cron.schedule('cleanup-webhook-logs', '0 2 * * *', 'SELECT cleanup_old_webhook_logs();');

-- Function to get webhook statistics
CREATE OR REPLACE FUNCTION get_webhook_stats(
  p_user_id uuid DEFAULT auth.uid(),
  p_days_back integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_webhooks', COUNT(*),
    'successful_webhooks', COUNT(*) FILTER (WHERE success = true),
    'failed_webhooks', COUNT(*) FILTER (WHERE success = false),
    'success_rate', ROUND(
      (COUNT(*) FILTER (WHERE success = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 2
    ),
    'webhook_types', jsonb_object_agg(
      webhook_type,
      jsonb_build_object(
        'count', count,
        'success_rate', success_rate
      )
    ),
    'daily_stats', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', date,
          'total', total,
          'successful', successful,
          'failed', failed
        ) ORDER BY date DESC
      )
      FROM (
        SELECT 
          date_trunc('day', created_at)::date as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE success = true) as successful,
          COUNT(*) FILTER (WHERE success = false) as failed
        FROM public.webhook_logs
        WHERE user_id = p_user_id
          AND created_at >= now() - (p_days_back || ' days')::interval
        GROUP BY date_trunc('day', created_at)
      ) daily_data
    ),
    'recent_errors', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'timestamp', created_at,
          'webhook_type', webhook_type,
          'event_type', event_type,
          'error_message', error_message,
          'http_status', http_status
        ) ORDER BY created_at DESC
      )
      FROM (
        SELECT *
        FROM public.webhook_logs
        WHERE user_id = p_user_id
          AND success = false
          AND created_at >= now() - (p_days_back || ' days')::interval
        ORDER BY created_at DESC
        LIMIT 10
      ) error_data
    )
  ) INTO result
  FROM (
    SELECT 
      webhook_type,
      COUNT(*) as count,
      ROUND((COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)) * 100, 2) as success_rate
    FROM public.webhook_logs
    WHERE user_id = p_user_id
      AND created_at >= now() - (p_days_back || ' days')::interval
    GROUP BY webhook_type
  ) type_stats;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute permission on the stats function
GRANT EXECUTE ON FUNCTION get_webhook_stats TO public;

-- Create view for recent webhook events (for dashboard)
CREATE OR REPLACE VIEW webhook_events_recent AS
SELECT 
  wl.id,
  wl.webhook_type,
  wl.event_type,
  wl.success,
  wl.error_message,
  wl.created_at,
  wl.meeting_id,
  m.title as meeting_title,
  u.email as user_email
FROM public.webhook_logs wl
LEFT JOIN public.meetings m ON wl.meeting_id = m.id
LEFT JOIN auth.users u ON wl.user_id = u.id
WHERE wl.created_at >= now() - interval '24 hours'
ORDER BY wl.created_at DESC;

-- Grant access to the view
GRANT SELECT ON webhook_events_recent TO public;

-- Add RLS to the view
ALTER VIEW webhook_events_recent SET (security_invoker = true);

-- Create a function to log webhook events (for use in other functions/services)
CREATE OR REPLACE FUNCTION log_webhook_event(
  p_user_id uuid,
  p_webhook_type text,
  p_endpoint text,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_response jsonb DEFAULT '{}'::jsonb,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_meeting_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.webhook_logs (
    user_id,
    webhook_type,
    endpoint,
    event_type,
    payload,
    response,
    success,
    error_message,
    meeting_id,
    processed_at
  ) VALUES (
    p_user_id,
    p_webhook_type,
    p_endpoint,
    p_event_type,
    p_payload,
    p_response,
    p_success,
    p_error_message,
    p_meeting_id,
    now()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_webhook_event TO public, service_role;