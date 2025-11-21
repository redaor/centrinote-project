/*
  # Add zapier_webhook to action_type constraint

  1. Changes
    - Modify the automations_action_type_check constraint to include 'zapier_webhook'
    - Add a function to handle Zapier webhook notifications
    - Add a trigger that executes when a zapier_webhook automation is created
*/

-- Modification de la contrainte sur action_type
ALTER TABLE automations DROP CONSTRAINT IF EXISTS automations_action_type_check;
ALTER TABLE automations ADD CONSTRAINT automations_action_type_check 
  CHECK (action_type = ANY (ARRAY['create_reminder'::text, 'send_notification'::text, 'zapier_webhook'::text]));

-- Création d'une fonction pour notifier Zapier
CREATE OR REPLACE FUNCTION notify_zapier()
RETURNS TRIGGER AS $$
BEGIN
  -- Logique pour notifier Zapier serait implémentée ici
  -- Pour l'instant, on se contente de logger l'événement
  RAISE NOTICE 'Zapier webhook would be triggered for automation: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Suppression du trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_notify_zapier ON automations;

-- Création d'un trigger pour notifier Zapier lors de la création d'une automatisation avec action_type='zapier_webhook'
CREATE TRIGGER trigger_notify_zapier
  AFTER INSERT ON automations
  FOR EACH ROW
  WHEN (NEW.action_type = 'zapier_webhook')
  EXECUTE FUNCTION notify_zapier();