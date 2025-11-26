-- Test des Heures calmes
-- Ce script teste si les heures calmes bloquent bien toutes les notifications

-- 1. Afficher l'état actuel des heures calmes dans user_settings
SELECT
  user_id,
  settings->'notifications'->'quietHours'->>'enabled' as quiet_hours_enabled,
  settings->'notifications'->'quietHours'->>'start' as quiet_start,
  settings->'notifications'->'quietHours'->>'end' as quiet_end,
  settings->'notifications'->>'timezone' as timezone
FROM user_settings
WHERE user_id = auth.uid();

-- 2. Obtenir l'heure actuelle en heure locale (pour vérifier si on est dans les heures calmes)
SELECT
  NOW() as utc_time,
  NOW() AT TIME ZONE 'Europe/Paris' as paris_time,
  TO_CHAR(NOW() AT TIME ZONE 'Europe/Paris', 'HH24:MI') as current_time_formatted;

-- 3. Forcer l'exécution immédiate de TOUTES les automations actives
UPDATE automations
SET
  next_execution_at = NOW(),
  updated_at = NOW()
WHERE
  user_id = auth.uid()
  AND is_active = true;

-- 4. Vérifier que les automations ont bien été mises à jour
SELECT
  id,
  name,
  is_active,
  next_execution_at,
  user_local_time
FROM automations
WHERE
  user_id = auth.uid()
  AND is_active = true
ORDER BY name;

-- 5. Attendre 1-2 minutes que automation-scheduler s'exécute
-- Puis vérifier les logs dans Supabase Dashboard :
-- https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions/automation-micro-runner/logs

-- Logs attendus si DANS les heures calmes :
-- 🔍 [QUIET-HOURS] Checking for user abc123: { currentTime: "23:30", quietStart: "22:00", quietEnd: "08:00" }
-- 🌙 [QUIET-HOURS] Currently in quiet hours (22:00 - 08:00), blocking notification
-- 🌙 [STUDY-REMINDER] Skipping due to quiet hours

-- Logs attendus si HORS des heures calmes :
-- ✅ [QUIET-HOURS] Outside quiet hours, allowing notification
-- ✅ [STUDY-REMINDER] Notification sent successfully

-- 6. Vérifier combien de notifications ont été créées (devrait être 0 si dans les heures calmes)
SELECT
  COUNT(*) as notifications_count,
  MAX(created_at) as last_notification
FROM notifications
WHERE
  user_id = auth.uid()
  AND created_at > NOW() - INTERVAL '5 minutes';

-- 7. Vérifier les exécutions skippées
SELECT
  id,
  status,
  trigger_data->>'template_id' as template,
  action_result->>'reason' as skip_reason,
  action_result->>'skipped' as was_skipped,
  started_at,
  completed_at
FROM automation_executions
WHERE
  trigger_data->>'user_id' = auth.uid()::text
  AND started_at > NOW() - INTERVAL '5 minutes'
ORDER BY started_at DESC
LIMIT 10;
