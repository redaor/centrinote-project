-- Test du toggle "Rappels"
-- Ce script déclenche study-reminder immédiatement pour tester si le toggle fonctionne

-- 1. Afficher l'état actuel du toggle reminders dans user_settings
SELECT
  user_id,
  settings->'notifications'->>'emails' as emails_enabled,
  settings->'notifications'->>'reminders' as reminders_enabled,
  settings->'notifications'->'quietHours'->>'enabled' as quiet_hours_enabled
FROM user_settings
WHERE user_id = auth.uid();

-- 2. Forcer l'exécution immédiate de study-reminder en mettant next_execution_at à maintenant
UPDATE automations
SET
  next_execution_at = NOW(),
  updated_at = NOW()
WHERE
  user_id = auth.uid()
  AND name = 'study-reminder'
  AND is_active = true;

-- 3. Vérifier que l'automation a bien été mise à jour
SELECT
  id,
  name,
  is_active,
  next_execution_at,
  user_local_time
FROM automations
WHERE
  user_id = auth.uid()
  AND name = 'study-reminder';

-- 4. Attendre 1-2 minutes que automation-scheduler s'exécute
-- Puis vérifier les logs dans Supabase Dashboard :
-- https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions/automation-micro-runner/logs

-- 5. Vérifier si une notification a été créée
SELECT
  id,
  title,
  message,
  type,
  created_at
FROM notifications
WHERE
  user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Logs attendus si reminders DÉSACTIVÉS :
-- 🔔 [STUDY-REMINDER] Skipping reminder due to user preferences

-- Logs attendus si reminders ACTIVÉS :
-- ✅ [REMINDER-CHECK] Reminders enabled for user abc123
-- ✅ [STUDY-REMINDER] Notification sent successfully

-- 6. Vérifier si une exécution a été enregistrée
SELECT
  id,
  status,
  trigger_data,
  action_result,
  started_at,
  completed_at
FROM automation_executions
WHERE
  trigger_data->>'user_id' = auth.uid()::text
  AND trigger_data->>'template_id' = 'study-reminder'
ORDER BY started_at DESC
LIMIT 1;
