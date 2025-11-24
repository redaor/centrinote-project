-- Vérifier l'état de l'automatisation weekly-summary dans la base de données

-- 1. Voir toutes les automatisations de l'utilisateur
SELECT
  id,
  name,
  user_id,
  is_active,
  next_execution_at,
  user_local_time,
  user_timezone,
  trigger_config,
  schedule_config,
  created_at,
  updated_at
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
ORDER BY updated_at DESC;

-- 2. Vérifier l'heure actuelle en UTC
SELECT NOW() as current_utc_time;

-- 3. Vérifier spécifiquement weekly-summary
SELECT
  name,
  is_active,
  next_execution_at,
  NOW() as current_time,
  (next_execution_at <= NOW()) as should_execute,
  EXTRACT(EPOCH FROM (NOW() - next_execution_at)) / 60 as minutes_ago,
  user_timezone,
  trigger_config,
  schedule_config
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name = 'weekly-summary';

-- 4. Voir toutes les automatisations qui devraient s'exécuter maintenant
SELECT
  name,
  is_active,
  next_execution_at,
  user_timezone,
  (is_active = true AND next_execution_at IS NOT NULL AND next_execution_at <= NOW()) as ready_to_execute,
  CASE
    WHEN is_active = false THEN 'Automatisation désactivée'
    WHEN next_execution_at IS NULL THEN 'Pas d''heure d''exécution définie'
    WHEN next_execution_at > NOW() THEN 'Heure d''exécution dans le futur'
    ELSE 'Prête à s''exécuter'
  END as status_reason
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
ORDER BY next_execution_at NULLS LAST;
