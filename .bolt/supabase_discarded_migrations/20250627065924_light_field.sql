/*
  # Mise à jour des types d'actions pour les automatisations

  1. Changements
    - Modification de la contrainte `automations_action_type_check` pour inclure 'send_email'
    - Vérification préalable de l'existence de la contrainte pour éviter les erreurs
  
  2. Sécurité
    - Aucun changement dans les politiques de sécurité
*/

-- Vérifier si la contrainte existe et la supprimer
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'automations_action_type_check' 
    AND conrelid = 'automations'::regclass
  ) THEN
    ALTER TABLE automations DROP CONSTRAINT automations_action_type_check;
  END IF;
END $$;

-- Recréer la contrainte avec les valeurs mises à jour
ALTER TABLE automations ADD CONSTRAINT automations_action_type_check 
  CHECK (action_type = ANY (ARRAY[
    'create_reminder'::text, 
    'send_notification'::text, 
    'send_email'::text,
    'zapier_webhook'::text
  ]));

-- Vérifier si le trigger existe déjà et le supprimer si c'est le cas
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_notify_zapier' 
    AND tgrelid = 'automations'::regclass
  ) THEN
    DROP TRIGGER trigger_notify_zapier ON automations;
  END IF;
END $$;

-- Vérifier si la fonction existe déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'notify_zapier' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Créer la fonction notify_zapier si elle n'existe pas
    CREATE FUNCTION notify_zapier()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Logique pour notifier Zapier serait implémentée ici
      -- Pour l'instant, on se contente de logger l'événement
      RAISE NOTICE 'Zapier webhook would be triggered for automation: %', NEW.id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Créer le trigger
CREATE TRIGGER trigger_notify_zapier
  AFTER INSERT ON automations
  FOR EACH ROW
  WHEN (NEW.action_type = 'zapier_webhook')
  EXECUTE FUNCTION notify_zapier();