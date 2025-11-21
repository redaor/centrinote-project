-- Create user_confirmations table for email confirmation tokens
CREATE TABLE IF NOT EXISTS public.user_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_confirmations_user_id ON public.user_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_confirmations_token ON public.user_confirmations(token);
CREATE INDEX IF NOT EXISTS idx_user_confirmations_expires_at ON public.user_confirmations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_confirmations_used ON public.user_confirmations(used);

-- Enable RLS
ALTER TABLE public.user_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS policies (only service role can manage confirmations)
CREATE POLICY "Service role can manage user_confirmations" ON public.user_confirmations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_confirmations_updated_at
  BEFORE UPDATE ON public.user_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_confirmations_updated_at();

-- Add comment
COMMENT ON TABLE public.user_confirmations IS 'Stores email confirmation tokens for user verification';
