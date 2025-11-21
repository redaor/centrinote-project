-- =====================================================
-- MICRO AUTOMATION TEMPLATES MIGRATION
-- Ajout de 3 templates simples niveau 🟢 et table quotes
-- =====================================================

-- =====================================================
-- 1. CREATE QUOTES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  author TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Public read access for authenticated users
DROP POLICY IF EXISTS "Quotes are publicly readable" ON quotes;
CREATE POLICY "Quotes are publicly readable"
  ON quotes FOR SELECT
  TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes(category);

-- =====================================================
-- 2. INSERT 10 CITATIONS GÉNÉRIQUES
-- =====================================================

INSERT INTO quotes (body, author, category) VALUES
('Petit à petit, l''oiseau fait son nid', 'Proverbe', 'motivation'),
('Rien ne sert de courir, il faut partir à point', 'Jean de La Fontaine', 'sagesse'),
('Le succès, c''est tomber sept fois et se relever huit', 'Proverbe japonais', 'perseverance'),
('L''éducation est l''arme la plus puissante pour changer le monde', 'Nelson Mandela', 'education'),
('Seul on va plus vite, ensemble on va plus loin', 'Proverbe africain', 'collaboration'),
('La lecture est à l''esprit ce que l''exercice est au corps', 'Joseph Addison', 'apprentissage'),
('Chaque expert a été un jour un débutant', 'Helen Hayes', 'motivation'),
('Le savoir que l''on ne complète pas chaque jour diminue tous les jours', 'Proverbe chinois', 'apprentissage'),
('L''avenir appartient à ceux qui croient en la beauté de leurs rêves', 'Eleanor Roosevelt', 'inspiration'),
('La seule façon de faire du bon travail est d''aimer ce que vous faites', 'Steve Jobs', 'passion')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. ADD OPTIONS TO EXISTING TEMPLATES
-- =====================================================

-- Add reminder_sound column to automation_templates (for daily_review)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_templates' AND column_name = 'options'
  ) THEN
    ALTER TABLE automation_templates ADD COLUMN options JSONB DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- 4. INSERT 3 NEW MICRO TEMPLATES
-- =====================================================

-- Template 1: FOCUS_MODE
INSERT INTO automation_templates (
  id,
  name,
  description,
  category,
  icon,
  color,
  trigger_schema,
  action_schema,
  options,
  is_premium
) VALUES (
  gen_random_uuid(),
  'Mode Focus',
  'Notification silencieuse au démarrage de session d''étude',
  'productivity',
  '🎯',
  '#6366f1',
  jsonb_build_object(
    'type', 'session_started',
    'description', 'Se déclenche au démarrage d''une session d''étude'
  ),
  jsonb_build_object(
    'type', 'send_notification',
    'title', 'Mode Focus',
    'message', 'Mode focus activé – notifications silencieuses',
    'notification_type', 'info',
    'priority', 'low'
  ),
  jsonb_build_object(
    'level', 'beginner',
    'icon_emoji', '🟢',
    'template_type', 'micro'
  ),
  false
) ON CONFLICT DO NOTHING;

-- Template 2: BREAK_TIME
INSERT INTO automation_templates (
  id,
  name,
  description,
  category,
  icon,
  color,
  trigger_schema,
  action_schema,
  options,
  is_premium
) VALUES (
  gen_random_uuid(),
  'Pause Active',
  'Email + notification 15 min après session ≥ 45 min',
  'wellbeing',
  '☕',
  '#10b981',
  jsonb_build_object(
    'type', 'session_completed',
    'description', 'Se déclenche après une session d''au moins 45 minutes',
    'conditions', jsonb_build_array(
      jsonb_build_object(
        'field', 'duration_minutes',
        'operator', 'greater_than',
        'value', 45
      )
    )
  ),
  jsonb_build_object(
    'type', 'send_email_and_notification',
    'email', jsonb_build_object(
      'subject', 'Pause Active - Centrinote',
      'body', 'Bravo pour cette session ! Prenez une pause bien méritée.'
    ),
    'notification', jsonb_build_object(
      'title', 'Pause Active',
      'message', 'Bravo ! Session terminée. Rappel dans 15 min.',
      'notification_type', 'success',
      'priority', 'normal'
    ),
    'delay_minutes', 15
  ),
  jsonb_build_object(
    'level', 'beginner',
    'icon_emoji', '🟢',
    'template_type', 'micro'
  ),
  false
) ON CONFLICT DO NOTHING;

-- Template 3: DAILY_QUOTE
INSERT INTO automation_templates (
  id,
  name,
  description,
  category,
  icon,
  color,
  trigger_schema,
  action_schema,
  options,
  is_premium
) VALUES (
  gen_random_uuid(),
  'Citation Motivation',
  'Citation aléatoire envoyée par email chaque jour à 08:00',
  'inspiration',
  '💭',
  '#f59e0b',
  jsonb_build_object(
    'type', 'time_based',
    'description', 'Se déclenche chaque jour à 08:00',
    'schedule', jsonb_build_object(
      'type', 'daily',
      'time', '08:00',
      'timezone', 'Europe/Paris'
    )
  ),
  jsonb_build_object(
    'type', 'send_email',
    'subject', 'Citation du jour - Centrinote',
    'body', 'Citation aléatoire depuis la table quotes',
    'source', 'quotes_table',
    'random', true
  ),
  jsonb_build_object(
    'level', 'beginner',
    'icon_emoji', '🟢',
    'template_type', 'micro'
  ),
  false
) ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. UPDATE EXISTING TEMPLATES WITH NEW OPTIONS
-- =====================================================

-- Update daily_review template to add reminder_sound option
UPDATE automation_templates
SET options = COALESCE(options, '{}'::jsonb) || jsonb_build_object('reminder_sound', true)
WHERE name = 'daily_review'
AND options IS NOT NULL;

-- Update vocab_milestone template to add share_button option
UPDATE automation_templates
SET options = COALESCE(options, '{}'::jsonb) || jsonb_build_object('share_button', false)
WHERE name = 'vocab_milestone'
AND options IS NOT NULL;

-- =====================================================
-- 6. CREATE HELPER FUNCTION FOR MICRO TEMPLATES
-- =====================================================

-- Function to get random quote
CREATE OR REPLACE FUNCTION get_random_quote(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  body TEXT,
  author TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.body, q.author, q.category
  FROM quotes q
  WHERE (p_category IS NULL OR q.category = p_category)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_random_quote TO authenticated;

-- =====================================================
-- 7. ADD MICRO TEMPLATE TRACKING
-- =====================================================

-- Add micro_template flag to automation_executions if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automation_executions' AND column_name = 'is_micro_template'
  ) THEN
    ALTER TABLE automation_executions ADD COLUMN is_micro_template BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for micro template executions
CREATE INDEX IF NOT EXISTS idx_executions_micro_template ON automation_executions(is_micro_template) WHERE is_micro_template = true;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Micro Automation Templates Migration Complete';
  RAISE NOTICE '📋 3 nouveaux templates créés: focus_mode, break_time, daily_quote';
  RAISE NOTICE '💬 Table quotes créée avec 10 citations';
  RAISE NOTICE '🎨 2 options ajoutées aux templates existants';
  RAISE NOTICE '🚀 Prêt à utiliser avec automation-micro-runner Edge Function';
END $$;
