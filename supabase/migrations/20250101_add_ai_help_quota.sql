-- Migration pour ajouter le quota ai_help_count
-- Limite l'Aide IA à 3 utilisations pour le plan Free

-- Ajouter la colonne ai_help_count à user_quotas si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_quotas' 
    AND column_name = 'ai_help_count'
  ) THEN
    ALTER TABLE user_quotas ADD COLUMN ai_help_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Ajouter la limite ai_help_count_limit aux plans si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscription_plans' 
    AND column_name = 'ai_help_count_limit'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN ai_help_count_limit INTEGER;
  END IF;
END $$;

-- Mettre à jour les limites pour chaque plan
UPDATE subscription_plans 
SET ai_help_count_limit = CASE 
  WHEN name = 'free' THEN 3
  WHEN name = 'starter' THEN 10
  WHEN name = 'pro' THEN 50
  WHEN name = 'teams' THEN NULL -- Illimité
  ELSE ai_help_count_limit
END
WHERE ai_help_count_limit IS NULL OR ai_help_count_limit = 0;

-- Supprimer les fonctions existantes avant de les recréer
-- Utiliser CASCADE pour supprimer toutes les dépendances et variantes possibles
DO $$ 
BEGIN
  -- Supprimer toutes les variantes de check_quota
  DROP FUNCTION IF EXISTS check_quota CASCADE;
  -- Supprimer toutes les variantes de increment_quota
  DROP FUNCTION IF EXISTS increment_quota CASCADE;
EXCEPTION
  WHEN undefined_function THEN
    -- Ignorer si les fonctions n'existent pas
    NULL;
  WHEN OTHERS THEN
    -- Ignorer les autres erreurs
    NULL;
END $$;

-- Mettre à jour la fonction check_quota pour inclure ai_help_count
CREATE FUNCTION check_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan RECORD;
  v_quota RECORD;
  v_limit INTEGER;
  v_usage INTEGER;
  v_allowed BOOLEAN;
  v_percentage NUMERIC;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT sp.* INTO v_plan
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Si pas de plan, utiliser le plan Free par défaut
  IF v_plan IS NULL THEN
    SELECT * INTO v_plan FROM subscription_plans WHERE name = 'free' LIMIT 1;
  END IF;

  -- Récupérer ou créer le quota pour le mois en cours
  INSERT INTO user_quotas (user_id, period_start, period_end)
  VALUES (
    p_user_id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month'
  )
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT * INTO v_quota
  FROM user_quotas
  WHERE user_id = p_user_id
    AND period_start = date_trunc('month', now());

  -- Déterminer la limite et l'utilisation selon la feature
  CASE p_feature
    WHEN 'ai_tokens' THEN
      v_limit := v_plan.ai_tokens_limit;
      v_usage := COALESCE(v_quota.ai_tokens_used, 0);
    WHEN 'meeting_count' THEN
      v_limit := v_plan.meeting_count_limit;
      v_usage := COALESCE(v_quota.meeting_count_used, 0);
    WHEN 'meeting_minutes' THEN
      v_limit := v_plan.meeting_minutes_limit;
      v_usage := COALESCE(v_quota.meeting_minutes_used, 0);
    WHEN 'summary_count' THEN
      v_limit := v_plan.summary_count_limit;
      v_usage := COALESCE(v_quota.summary_count_used, 0);
    WHEN 'vocab_words' THEN
      v_limit := v_plan.vocab_words_limit;
      v_usage := COALESCE(v_quota.vocab_words_count, 0);
    WHEN 'vocab_collections' THEN
      v_limit := v_plan.vocab_collections_limit;
      v_usage := COALESCE(v_quota.vocab_collections_count, 0);
    WHEN 'automations_active' THEN
      v_limit := v_plan.automations_active_limit;
      v_usage := COALESCE(v_quota.automations_active, 0);
    WHEN 'ai_help_count' THEN
      v_limit := v_plan.ai_help_count_limit;
      v_usage := COALESCE(v_quota.ai_help_count, 0);
    ELSE
      v_limit := NULL;
      v_usage := 0;
  END CASE;

  -- Vérifier si l'action est autorisée
  IF v_limit IS NULL THEN
    -- Illimité
    v_allowed := true;
    v_percentage := 0;
  ELSE
    v_allowed := (v_usage + p_increment) <= v_limit;
    v_percentage := ROUND((v_usage::NUMERIC / NULLIF(v_limit, 0)) * 100, 1);
  END IF;

  -- Retourner le résultat
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'usage', v_usage,
    'limit', v_limit,
    'percentage', v_percentage,
    'plan_name', v_plan.name,
    'plan_display_name', v_plan.display_name,
    'upgrade_required', NOT v_allowed AND v_limit IS NOT NULL
  );
END;
$$;

-- Mettre à jour la fonction increment_quota pour inclure ai_help_count
CREATE FUNCTION increment_quota(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_quotas
  SET
    ai_tokens_used = CASE WHEN p_feature = 'ai_tokens' THEN ai_tokens_used + p_increment ELSE ai_tokens_used END,
    meeting_count_used = CASE WHEN p_feature = 'meeting_count' THEN meeting_count_used + p_increment ELSE meeting_count_used END,
    meeting_minutes_used = CASE WHEN p_feature = 'meeting_minutes' THEN meeting_minutes_used + p_increment ELSE meeting_minutes_used END,
    summary_count_used = CASE WHEN p_feature = 'summary_count' THEN summary_count_used + p_increment ELSE summary_count_used END,
    vocab_words_count = CASE WHEN p_feature = 'vocab_words' THEN vocab_words_count + p_increment ELSE vocab_words_count END,
    vocab_collections_count = CASE WHEN p_feature = 'vocab_collections' THEN vocab_collections_count + p_increment ELSE vocab_collections_count END,
    automations_active = CASE WHEN p_feature = 'automations_active' THEN automations_active + p_increment ELSE automations_active END,
    ai_help_count = CASE WHEN p_feature = 'ai_help_count' THEN COALESCE(ai_help_count, 0) + p_increment ELSE ai_help_count END,
    updated_at = now()
  WHERE user_id = p_user_id
    AND period_start = date_trunc('month', now());

  RETURN FOUND;
END;
$$;

