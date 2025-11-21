-- Migration to fix RLS policy for user_stats_cache table
-- Problem: The trigger on notes tries to INSERT/UPDATE into user_stats_cache,
-- but the current RLS policy only allows SELECT.
-- Solution: Add a policy that allows users to INSERT and UPDATE their own stats.

-- Add INSERT/UPDATE policy for user_stats_cache
CREATE POLICY "Users can manage their own stats" ON user_stats_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats_cache
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
