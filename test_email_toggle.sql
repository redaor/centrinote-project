-- Test du toggle "Notifications par email"
-- Ce script déclenche daily_quote immédiatement pour tester si le toggle fonctionne

-- 1. Afficher l'état actuel du toggle emails dans user_settings
SELECT
  user_id,
  settings->'notifications'->>'emails' as emails_enabled,
  settings->'notifications'->>'reminders' as reminders_enabled,
  settings->'notifications'->'quietHours'->>'enabled' as quiet_hours_enabled
FROM user_settings
WHERE user_id = auth.uid();

-- 2. Forcer l'exécution immédiate de daily_quote en mettant next_execution_at à maintenant
UPDATE automations
SET
  next_execution_at = NOW(),
  updated_at = NOW()
WHERE
  user_id = auth.uid()
  AND name = 'daily_quote'
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
  AND name = 'daily_quote';

-- 4. Attendre 1-2 minutes que automation-scheduler s'exécute
-- Puis vérifier les logs dans Supabase Dashboard :
-- https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions/automation-micro-runner/logs

-- 5. Vérifier si un email a été envoyé (si emails désactivés, il ne devrait PAS y avoir d'email)
-- Logs attendus si emails DÉSACTIVÉS :
-- 📧 [DAILY-QUOTE] Skipping email due to user preferences

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
  AND trigger_data->>'template_id' = 'daily_quote'
ORDER BY started_at DESC
LIMIT 1;
