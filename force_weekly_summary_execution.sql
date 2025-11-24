-- Forcer l'exécution immédiate de weekly-summary
-- en mettant next_execution_at dans le passé récent

UPDATE automations
SET
  next_execution_at = NOW() - INTERVAL '1 minute',
  updated_at = NOW()
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name = 'weekly-summary';

-- Vérifier le résultat
SELECT
  name,
  is_active,
  next_execution_at,
  NOW() as current_time,
  user_timezone,
  user_local_time,
  (next_execution_at <= NOW()) as should_execute_now
FROM automations
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND name = 'weekly-summary';
