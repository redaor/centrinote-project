-- ============================================================================
-- Trigger pour indexation automatique du vocabulaire
-- ============================================================================
-- Ce trigger appelle automatiquement l'Edge Function index-vocabulary lorsqu'une
-- entrée de vocabulaire est créée ou mise à jour. L'indexation se fait en arrière-plan via
-- pg_net (Supabase HTTP extension).
-- ============================================================================

-- Activer l'extension pg_net si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction améliorée pour appeler l'Edge Function index-vocabulary
CREATE OR REPLACE FUNCTION trigger_index_vocabulary()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- Essayer de récupérer l'URL depuis les settings
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    supabase_url := NULL;
  END;
  
  -- Si pas d'URL configurée, utiliser l'URL par défaut de Supabase
  -- IMPORTANT: Remplacez YOUR_PROJECT_REF par votre vraie référence de projet
  IF supabase_url IS NULL OR supabase_url = '' THEN
    BEGIN
      supabase_url := current_setting('app.settings.supabase_url', true);
    EXCEPTION WHEN OTHERS THEN
      supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
      RAISE WARNING 'URL Supabase non configurée, utilisation de la valeur par défaut. Veuillez configurer app.settings.supabase_url';
    END;
  END IF;
  
  -- Construire l'URL de l'Edge Function
  function_url := supabase_url || '/functions/v1/index-vocabulary';
  
  -- Récupérer la service role key (optionnel, peut utiliser anon key)
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;
  
  -- Si pas de service key, utiliser anon key (moins sécurisé mais fonctionne)
  IF service_key IS NULL OR service_key = '' THEN
    BEGIN
      service_key := current_setting('app.settings.anon_key', true);
    EXCEPTION WHEN OTHERS THEN
      service_key := NULL;
    END;
  END IF;
  
  -- Appeler l'Edge Function via pg_net (en arrière-plan, non bloquant)
  IF service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'vocabulary_id', NEW.id,
          'user_id', NEW."userId"
        )
      );
  ELSE
    RAISE WARNING 'Service key non configurée, impossible d''appeler index-vocabulary pour le vocabulaire %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'opération
    RAISE WARNING 'Erreur lors de l''appel de index-vocabulary pour le vocabulaire %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger existe déjà, pas besoin de le recréer
-- Mais on peut vérifier qu'il est bien configuré
DO $$
BEGIN
  -- Vérifier si le trigger existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_index_vocabulary'
  ) THEN
    -- Créer le trigger s'il n'existe pas
    CREATE TRIGGER trigger_auto_index_vocabulary
      AFTER INSERT OR UPDATE OF word, definition, examples ON public.vocabulary
      FOR EACH ROW
      WHEN (NEW.word IS NOT NULL OR NEW.definition IS NOT NULL)
      EXECUTE FUNCTION trigger_index_vocabulary();
  END IF;
END $$;

-- Commentaire
COMMENT ON FUNCTION trigger_index_vocabulary IS 'Déclenche l''indexation automatique d''une entrée de vocabulaire via l''Edge Function index-vocabulary (version améliorée)';

