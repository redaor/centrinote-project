-- ========================================
-- MIGRATION : Système de quotas CentriNote Launch
-- Date : 2024-11-29
-- Description : Grille tarifaire complète avec quotas par feature
-- ========================================

-- ========================================
-- TABLE : subscription_plans (config limites)
-- ========================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'starter', 'pro', 'teams'
  display_name TEXT NOT NULL,
  price_cents INTEGER DEFAULT 0,
  promo_price_cents INTEGER, -- Prix promo (NULL si pas de promo)
  promo_end_date TIMESTAMPTZ, -- Date de fin de promo

  -- Limites IA
  ai_tokens_limit BIGINT, -- NULL = illimité

  -- Limites Réunions
  meeting_count_limit INTEGER, -- Nombre de réunions/mois
  meeting_minutes_limit INTEGER, -- Durée totale/mois (minutes)
  meeting_max_duration_minutes INTEGER, -- Durée max par réunion (45 ou 60)

  -- Limites Résumés
  summary_count_limit INTEGER, -- Nombre de résumés IA/mois

  -- Limites Vocabulaire
  vocab_words_limit INTEGER, -- Nombre de mots total
  vocab_collections_limit INTEGER, -- Nombre de collections

  -- Limites Notifications
  notifications_limit INTEGER, -- Envois/mois

  -- Limites Automatisations
  automations_active_limit INTEGER, -- Nombre d'automations actives simultanément
  automations_executions_limit INTEGER, -- Exécutions/mois

  -- Métadonnées
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- ========================================
-- Seed des plans de lancement
-- ========================================
-- Supprimer les anciens plans s'ils existent
DELETE FROM subscription_plans;

-- Insérer les nouveaux plans avec promo 30 jours
INSERT INTO subscription_plans (
  name, display_name, price_cents, promo_price_cents, promo_end_date,
  ai_tokens_limit, meeting_count_limit, meeting_minutes_limit, meeting_max_duration_minutes,
  summary_count_limit, vocab_words_limit, vocab_collections_limit,
  notifications_limit, automations_active_limit, automations_executions_limit,
  is_visible, sort_order
) VALUES
  -- FREE
  (
    'free', 'Free', 0, NULL, NULL,
    20000, -- 20k tokens IA
    1, 45, 45, -- 1 réunion max 45 min
    1, -- 1 résumé
    50, 3, -- 50 mots, 3 collections
    20, -- 20 notifications
    1, NULL, -- 1 automation active
    true, 0
  ),

  -- STARTER (promo -23%)
  (
    'starter', 'Starter', 1299, 999, (now() + interval '30 days'),
    150000, -- 150k tokens IA
    10, 450, 45, -- 10 réunions max 45 min (450 min total)
    8, -- 5-8 résumés
    100, 10, -- 100 mots, 10 collections
    100, -- 100 notifications
    5, 500, -- 5 automations actives, 500 exécutions
    true, 1
  ),

  -- PRO (promo -33%)
  (
    'pro', 'Pro', 2999, 1999, (now() + interval '30 days'),
    600000, -- 600k tokens IA
    20, 1200, 60, -- 20 réunions max 60 min (1200 min total)
    NULL, -- Résumé illimité
    500, 50, -- 500 mots, 50 collections
    500, -- 500 notifications
    NULL, NULL, -- Automations illimitées
    true, 2
  ),

  -- TEAMS (promo -20%)
  (
    'teams', 'Teams', 4999, 3999, (now() + interval '30 days'),
    NULL, -- Tokens IA illimités
    60, NULL, 60, -- 60 réunions max 60 min (durée totale illimitée)
    NULL, -- Résumé illimité
    1000, NULL, -- 1000 mots, collections illimitées
    NULL, -- Notifications illimitées
    NULL, NULL, -- Automations illimitées
    true, 3
  );

-- ========================================
-- TABLE : user_quotas (compteurs mensuels)
-- ========================================
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Période de facturation
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),

  -- Compteurs d'usage
  ai_tokens_used BIGINT DEFAULT 0,
  meeting_count_used INTEGER DEFAULT 0,
  meeting_minutes_used INTEGER DEFAULT 0,
  summary_count_used INTEGER DEFAULT 0,
  vocab_words_count INTEGER DEFAULT 0,
  vocab_collections_count INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  automations_active INTEGER DEFAULT 0,
  automations_executions INTEGER DEFAULT 0,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_quotas_user_period ON user_quotas(user_id, period_start DESC);

-- ========================================
-- TABLE : user_subscriptions (lien user ↔ plan)
-- ========================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'trialing'
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Paiement
  payment_provider TEXT, -- 'stripe', 'paypal', NULL (gratuit)
  payment_customer_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- ========================================
-- FUNCTION : reset_monthly_quotas (cron)
-- ========================================
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Créer de nouvelles périodes pour tous les users actifs
  INSERT INTO user_quotas (user_id, period_start, period_end)
  SELECT
    u.id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month'
  FROM auth.users u
  WHERE u.deleted_at IS NULL -- Seulement les users actifs
  ON CONFLICT (user_id, period_start) DO NOTHING;

  RAISE NOTICE 'Quotas réinitialisés pour le mois %', to_char(now(), 'YYYY-MM');
END;
$$;

-- ========================================
-- FUNCTION : get_user_plan
-- ========================================
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
BEGIN
  -- Récupérer le plan actif
  SELECT sp.* INTO v_plan
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
  LIMIT 1;

  IF NOT FOUND THEN
    -- Fallback sur Free si pas d'abonnement
    SELECT * INTO v_plan FROM subscription_plans WHERE name = 'free';
  END IF;

  RETURN v_plan;
END;
$$;

-- ========================================
-- FUNCTION : check_quota (middleware)
-- ========================================
CREATE OR REPLACE FUNCTION check_quota(
  p_user_id UUID,
  p_feature TEXT, -- 'ai_tokens', 'meeting_count', 'meeting_minutes', 'summary_count', etc.
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
  v_quota user_quotas%ROWTYPE;
  v_current_usage BIGINT;
  v_limit BIGINT;
  v_percentage NUMERIC;
BEGIN
  -- Récupérer le plan actif
  v_plan := get_user_plan(p_user_id);

  -- Récupérer le quota du mois en cours (ou créer)
  SELECT * INTO v_quota
  FROM user_quotas
  WHERE user_id = p_user_id
    AND period_start = date_trunc('month', now())
  LIMIT 1;

  IF NOT FOUND THEN
    -- Créer le quota si inexistant
    INSERT INTO user_quotas (user_id, period_start, period_end)
    VALUES (p_user_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month')
    RETURNING * INTO v_quota;
  END IF;

  -- Déterminer usage actuel et limite selon la feature
  CASE p_feature
    WHEN 'ai_tokens' THEN
      v_current_usage := v_quota.ai_tokens_used;
      v_limit := v_plan.ai_tokens_limit;
    WHEN 'meeting_count' THEN
      v_current_usage := v_quota.meeting_count_used;
      v_limit := v_plan.meeting_count_limit;
    WHEN 'meeting_minutes' THEN
      v_current_usage := v_quota.meeting_minutes_used;
      v_limit := v_plan.meeting_minutes_limit;
    WHEN 'summary_count' THEN
      v_current_usage := v_quota.summary_count_used;
      v_limit := v_plan.summary_count_limit;
    WHEN 'vocab_words' THEN
      v_current_usage := v_quota.vocab_words_count;
      v_limit := v_plan.vocab_words_limit;
    WHEN 'vocab_collections' THEN
      v_current_usage := v_quota.vocab_collections_count;
      v_limit := v_plan.vocab_collections_limit;
    WHEN 'notifications' THEN
      v_current_usage := v_quota.notifications_sent;
      v_limit := v_plan.notifications_limit;
    WHEN 'automations_active' THEN
      v_current_usage := v_quota.automations_active;
      v_limit := v_plan.automations_active_limit;
    WHEN 'automations_executions' THEN
      v_current_usage := v_quota.automations_executions;
      v_limit := v_plan.automations_executions_limit;
    ELSE
      RAISE EXCEPTION 'Feature inconnue: %', p_feature;
  END CASE;

  -- Si NULL = illimité (plans Pro/Teams)
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'usage', v_current_usage,
      'limit', 'unlimited',
      'percentage', 0,
      'plan_name', v_plan.name,
      'plan_display_name', v_plan.display_name
    );
  END IF;

  -- Calculer pourcentage
  v_percentage := CASE
    WHEN v_limit = 0 THEN 100
    ELSE (v_current_usage::NUMERIC / v_limit::NUMERIC) * 100
  END;

  -- Vérifier si dépassement
  IF v_current_usage + p_increment > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage', v_current_usage,
      'limit', v_limit,
      'percentage', v_percentage,
      'message', format('Quota dépassé pour %s (%s/%s)', p_feature, v_current_usage, v_limit),
      'plan_name', v_plan.name,
      'plan_display_name', v_plan.display_name,
      'upgrade_required', true
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'usage', v_current_usage,
    'limit', v_limit,
    'percentage', v_percentage,
    'plan_name', v_plan.name,
    'plan_display_name', v_plan.display_name
  );
END;
$$;

-- ========================================
-- FUNCTION : increment_quota
-- ========================================
CREATE OR REPLACE FUNCTION increment_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- S'assurer que le quota existe
  INSERT INTO user_quotas (user_id, period_start, period_end)
  VALUES (p_user_id, date_trunc('month', now()), date_trunc('month', now()) + interval '1 month')
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Incrémenter le compteur approprié
  UPDATE user_quotas
  SET
    ai_tokens_used = CASE WHEN p_feature = 'ai_tokens' THEN ai_tokens_used + p_amount ELSE ai_tokens_used END,
    meeting_count_used = CASE WHEN p_feature = 'meeting_count' THEN meeting_count_used + p_amount ELSE meeting_count_used END,
    meeting_minutes_used = CASE WHEN p_feature = 'meeting_minutes' THEN meeting_minutes_used + p_amount ELSE meeting_minutes_used END,
    summary_count_used = CASE WHEN p_feature = 'summary_count' THEN summary_count_used + p_amount ELSE summary_count_used END,
    vocab_words_count = CASE WHEN p_feature = 'vocab_words' THEN vocab_words_count + p_amount ELSE vocab_words_count END,
    vocab_collections_count = CASE WHEN p_feature = 'vocab_collections' THEN vocab_collections_count + p_amount ELSE vocab_collections_count END,
    notifications_sent = CASE WHEN p_feature = 'notifications' THEN notifications_sent + p_amount ELSE notifications_sent END,
    automations_active = CASE WHEN p_feature = 'automations_active' THEN automations_active + p_amount ELSE automations_active END,
    automations_executions = CASE WHEN p_feature = 'automations_executions' THEN automations_executions + p_amount ELSE automations_executions END,
    updated_at = now()
  WHERE user_id = p_user_id
    AND period_start = date_trunc('month', now());
END;
$$;

-- ========================================
-- FUNCTION : check_meeting_duration_limit
-- ========================================
CREATE OR REPLACE FUNCTION check_meeting_duration_limit(
  p_user_id UUID,
  p_duration_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan subscription_plans%ROWTYPE;
BEGIN
  v_plan := get_user_plan(p_user_id);

  -- Vérifier la durée max par réunion
  IF v_plan.meeting_max_duration_minutes IS NOT NULL
     AND p_duration_minutes > v_plan.meeting_max_duration_minutes THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'max_duration', v_plan.meeting_max_duration_minutes,
      'requested_duration', p_duration_minutes,
      'message', format('Durée max : %s min (plan %s)', v_plan.meeting_max_duration_minutes, v_plan.display_name),
      'upgrade_required', true
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'max_duration', v_plan.meeting_max_duration_minutes,
    'requested_duration', p_duration_minutes
  );
END;
$$;

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own quotas" ON user_quotas;
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Plans are public" ON subscription_plans;

-- Créer les nouvelles policies
CREATE POLICY "Users can view own quotas"
  ON user_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Plans are public"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- ========================================
-- TRIGGER : Auto-update updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- CRON JOB : Reset mensuel des quotas
-- ========================================
-- Note : À configurer manuellement dans Supabase Dashboard
-- Extension pg_cron requise
-- Syntax : SELECT cron.schedule('reset-monthly-quotas', '0 0 1 * *', 'SELECT reset_monthly_quotas();');

COMMENT ON FUNCTION reset_monthly_quotas() IS 'Cron job : Réinitialiser les quotas le 1er de chaque mois à minuit UTC';
COMMENT ON FUNCTION check_quota(UUID, TEXT, INTEGER) IS 'Vérifier si un user peut consommer une feature (retourne allowed: boolean)';
COMMENT ON FUNCTION increment_quota(UUID, TEXT, INTEGER) IS 'Incrémenter le compteur d''usage d''une feature';
COMMENT ON FUNCTION check_meeting_duration_limit(UUID, INTEGER) IS 'Vérifier si la durée de réunion est autorisée pour le plan de l''user';
