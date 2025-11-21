-- Migration: Add participants column to meetings table
-- Date: 2025-09-22
-- Description: Store meeting participants as JSONB array

-- Add participants column if not exists
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.meetings.participants IS 'Array of participant objects with name, email, and role';

-- Create GIN index for efficient JSON queries (optional)
CREATE INDEX IF NOT EXISTS meetings_participants_gin
ON public.meetings USING gin (participants jsonb_path_ops);

-- Create index for searching by email within participants (optional)
CREATE INDEX IF NOT EXISTS meetings_participants_email
ON public.meetings USING gin ((participants) gin_trgm_ops);