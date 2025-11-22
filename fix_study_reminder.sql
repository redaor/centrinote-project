-- =====================================================
-- CORRECTION DE L'AUTOMATISATION study-reminder
-- =====================================================

-- 1. Vérifier l'état actuel
SELECT 
  id,
  name,
  is_active,
  action_type,
  action_config,
  user_local_time,
  user_timezone,
  next_execution_at
FROM automations
WHERE name = 'study-reminder';

-- 2. Corriger action_type si nécessaire (pour compatibilité, même si c'est un micro template)
-- Note: study-reminder est maintenant un micro template, donc action_type n'est plus utilisé
-- mais on le corrige quand même pour éviter des erreurs
UPDATE automations
SET 
  action_type = 'send_notification',  -- Corriger si c'était 'notification'
  action_config = COALESCE(action_config, '{}'::jsonb) || '{"title": "📚 Session d''étude", "message": "C''est l''heure d''étudier ! 💪"}'::jsonb,
  updated_at = NOW()
WHERE name = 'study-reminder'
  AND (action_type IS NULL OR action_type = 'notification' OR action_type = '');

-- 3. Vérifier que user_local_time et user_timezone sont bien définis
UPDATE automations
SET 
  user_timezone = COALESCE(user_timezone, 'Africa/Algiers'),
  updated_at = NOW()
WHERE name = 'study-reminder'
  AND user_timezone IS NULL;

-- 4. Vérifier le résultat
SELECT 
  id,
  name,
  is_active,
  action_type,
  action_config,
  user_local_time,
  user_timezone,
  next_execution_at,
  updated_at
FROM automations
WHERE name = 'study-reminder';

-- 5. Vérifier que le cron fonctionne
SELECT 
  jobid,
  schedule,
  jobname,
  active
FROM cron.job
WHERE jobname LIKE '%automation%'
ORDER BY jobid;

