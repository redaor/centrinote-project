/*
  # Create reminders table

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `message` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `reminders` table
    - Add policies for users to manage their own reminders
*/

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own reminders"
  ON reminders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_created_at_idx ON reminders(created_at);