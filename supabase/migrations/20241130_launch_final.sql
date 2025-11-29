-- ========================================
-- MIGRATION : CentriNote Launch - Final
-- Date : 2024-11-30
-- Description : Migration données + ajout colonnes manquantes
-- ========================================

-- ========================================
-- 1. Ajouter colonne meeting_max_participants si elle n'existe pas
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' 
    AND column_name = 'meeting_max_participants'
  ) THEN
    ALTER TABLE subscription_plans 
    ADD COLUMN meeting_max_participants INTEGER;
  END IF;
END $$;

-- ========================================
-- 2. Mettre à jour les plans avec meeting_max_participants
-- ========================================
UPDATE subscription_plans 
SET meeting_max_participants = 3 
WHERE name = 'free';

UPDATE subscription_plans 
SET meeting_max_participants = 8 
WHERE name = 'starter';

UPDATE subscription_plans 
SET meeting_max_participants = 15 
WHERE name = 'pro';

UPDATE subscription_plans 
SET meeting_max_participants = NULL -- Illimité
WHERE name = 'teams';

-- ========================================
-- 3. S'assurer que le plan Teams existe (insert si nécessaire)
-- ========================================
INSERT INTO subscription_plans (
  name, display_name, price_cents, promo_price_cents, promo_end_date,
  ai_tokens_limit, meeting_count_limit, meeting_minutes_limit, 
  meeting_max_duration_minutes, meeting_max_participants,
  summary_count_limit, vocab_words_limit, vocab_collections_limit,
  notifications_limit, automations_active_limit, automations_executions_limit,
  is_visible, sort_order
)
SELECT 
  'teams', 'Teams', 4999, 3999, (NOW() + INTERVAL '30 days'),
  NULL, -- Tokens IA illimités
  60, NULL, 60, NULL, -- 60 réunions max 60 min, participants illimités
  NULL, -- Résumé illimité
  1000, NULL, -- 1000 mots, collections illimitées
  NULL, -- Notifications illimitées
  NULL, NULL, -- Automations illimitées
  true, 3
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'teams'
);

-- ========================================
-- 4. Migration des données : profiles.subscription → user_subscriptions
-- ========================================
INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at)
SELECT 
  p.id AS user_id,
  sp.id AS plan_id,
  CASE 
    WHEN p.subscription = 'free' THEN 'active'
    WHEN p.subscription = 'basic' THEN 'active'
    WHEN p.subscription = 'premium' THEN 'active'
    ELSE 'active'
  END AS status,
  COALESCE(p.created_at, NOW()) AS started_at,
  CASE 
    WHEN p.subscription = 'free' THEN NULL -- Free n'expire pas
    ELSE NULL -- Les autres plans sont gérés par Stripe
  END AS expires_at
FROM profiles p
LEFT JOIN subscription_plans sp ON 
  CASE 
    WHEN p.subscription = 'free' THEN sp.name = 'free'
    WHEN p.subscription = 'basic' THEN sp.name = 'starter'
    WHEN p.subscription = 'premium' THEN sp.name = 'pro'
    ELSE sp.name = 'free'
  END
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us 
  WHERE us.user_id = p.id
)
AND sp.id IS NOT NULL; -- S'assurer qu'un plan a été trouvé

-- ========================================
-- 5. Initialiser les quotas pour les utilisateurs existants
-- ========================================
INSERT INTO user_quotas (user_id, period_start, period_end)
SELECT 
  p.id,
  date_trunc('month', NOW()) AS period_start,
  (date_trunc('month', NOW()) + INTERVAL '1 month') AS period_end
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_quotas uq 
  WHERE uq.user_id = p.id 
  AND uq.period_start = date_trunc('month', NOW())
);

-- ========================================
-- 6. Table de mapping price_id Stripe → plan name
-- ========================================
CREATE TABLE IF NOT EXISTS stripe_price_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id TEXT NOT NULL UNIQUE,
  plan_name TEXT NOT NULL REFERENCES subscription_plans(name),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_price_mapping_price_id ON stripe_price_mapping(price_id);
CREATE INDEX IF NOT EXISTS idx_stripe_price_mapping_plan_name ON stripe_price_mapping(plan_name);

-- Seed initial (à compléter avec vos vrais price IDs Stripe depuis Stripe Dashboard)
-- IMPORTANT: Remplacer les placeholders par vos vrais price IDs
-- Pour trouver vos price IDs: Stripe Dashboard → Products → Prices
-- 
-- Note: Les price IDs doivent être ajoutés manuellement depuis Stripe Dashboard
-- Exécuter après avoir créé les produits/prix dans Stripe:
-- 
-- INSERT INTO stripe_price_mapping (price_id, plan_name) VALUES 
--   ('price_xxx_STARTER', 'starter'),
--   ('price_xxx_PRO', 'pro'),
--   ('price_xxx_TEAMS', 'teams')
-- ON CONFLICT (price_id) DO NOTHING;
--
-- Pour l'instant, on ne fait rien car les price IDs doivent être ajoutés manuellement

-- ========================================
-- 7. Commentaires
-- ========================================
COMMENT ON COLUMN subscription_plans.meeting_max_participants IS 'Nombre maximum de participants par réunion (NULL = illimité)';
COMMENT ON TABLE stripe_price_mapping IS 'Mapping entre price_id Stripe et plan name pour webhook';

