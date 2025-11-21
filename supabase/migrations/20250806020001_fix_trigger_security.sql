-- Migration to fix trigger security for user_stats_cache
-- Problem: The trigger function runs with the privileges of the user who triggers it (SECURITY INVOKER by default),
-- which causes RLS policy violations.
-- Solution: Recreate the function with SECURITY DEFINER so it runs with the privileges of the function owner
-- (typically a superuser or the user who owns the function).

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_user_stats_notes ON notes;
DROP TRIGGER IF EXISTS trigger_update_user_stats_vocabulary ON vocabulary;

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_user_stats_cache()
RETURNS TRIGGER 
SECURITY DEFINER -- This allows the function to bypass RLS policies
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'notes' THEN
        target_user_id := COALESCE(NEW."userId", OLD."userId");
    ELSIF TG_TABLE_NAME = 'vocabulary' THEN
        target_user_id := COALESCE(NEW."userId", OLD."userId");
    END IF;

    IF target_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    INSERT INTO user_stats_cache (
        user_id, total_notes, total_vocabulary, mastered_vocabulary, last_activity_at, stats_updated_at
    )
    VALUES (
        target_user_id,
        (SELECT COUNT(*) FROM notes WHERE "userId" = target_user_id),
        (SELECT COUNT(*) FROM vocabulary WHERE "userId" = target_user_id),
        (SELECT COUNT(*) FROM vocabulary WHERE "userId" = target_user_id AND mastery >= 80),
        NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_notes = EXCLUDED.total_notes,
        total_vocabulary = EXCLUDED.total_vocabulary,
        mastered_vocabulary = EXCLUDED.mastered_vocabulary,
        last_activity_at = EXCLUDED.last_activity_at,
        stats_updated_at = EXCLUDED.stats_updated_at;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate triggers
CREATE TRIGGER trigger_update_user_stats_notes 
  AFTER INSERT OR UPDATE OR DELETE ON notes 
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_cache();

CREATE TRIGGER trigger_update_user_stats_vocabulary 
  AFTER INSERT OR UPDATE OR DELETE ON vocabulary 
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_cache();
