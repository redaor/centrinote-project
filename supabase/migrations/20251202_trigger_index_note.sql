-- ============================================================================
-- Trigger pour indexation automatique des notes
-- ============================================================================
-- Ce trigger appelle automatiquement l'Edge Function index-note lorsqu'une
-- note est créée ou mise à jour. L'indexation se fait en arrière-plan via
-- pg_net (Supabase HTTP extension).
-- ============================================================================

-- Activer l'extension pg_net si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction pour appeler l'Edge Function index-note
CREATE OR REPLACE FUNCTION trigger_index_note()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  supabase_service_key TEXT;
  function_url TEXT;
BEGIN
  -- Récupérer les variables d'environnement Supabase
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);
  
  -- Si les variables ne sont pas définies, utiliser les valeurs par défaut
  -- (Ces valeurs doivent être configurées dans Supabase Dashboard > Settings > API)
  IF supabase_url IS NULL THEN
    -- Utiliser la variable d'environnement Supabase si disponible
    supabase_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://YOUR_PROJECT_REF.supabase.co' -- À remplacer par votre URL Supabase
    );
  END IF;
  
  -- Construire l'URL de l'Edge Function
  function_url := supabase_url || '/functions/v1/index-note';
  
  -- Appeler l'Edge Function via pg_net (en arrière-plan, non bloquant)
  PERFORM
    net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(supabase_service_key, 'YOUR_SERVICE_KEY')
      ),
      body := jsonb_build_object(
        'note_id', NEW.id,
        'user_id', NEW."userId"
      )
    );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'opération
    RAISE WARNING 'Erreur lors de l''appel de index-note pour la note %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_auto_index_note ON public.notes;

-- Créer le trigger sur INSERT et UPDATE
CREATE TRIGGER trigger_auto_index_note
  AFTER INSERT OR UPDATE OF title, content ON public.notes
  FOR EACH ROW
  WHEN (NEW.title IS NOT NULL OR NEW.content IS NOT NULL)
  EXECUTE FUNCTION trigger_index_note();

-- Commentaire
COMMENT ON FUNCTION trigger_index_note IS 'Déclenche l''indexation automatique d''une note via l''Edge Function index-note';
COMMENT ON TRIGGER trigger_auto_index_note ON public.notes IS 'Indexe automatiquement une note après création ou mise à jour';

