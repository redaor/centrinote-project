-- ============================================================================
-- FIX: Mettre à jour le trigger avec l'URL Supabase en dur
-- ============================================================================
-- Ce script met à jour la fonction trigger pour utiliser l'URL Supabase directement
-- sans avoir besoin de configurer les settings (qui nécessitent des privilèges)
-- ============================================================================

-- Activer l'extension pg_net si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction améliorée pour appeler l'Edge Function index-vocabulary
-- avec l'URL Supabase en dur (pas besoin de settings)
CREATE OR REPLACE FUNCTION trigger_index_vocabulary()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT := 'https://wjzlicokhxitmeoxkjzv.supabase.co';  -- URL de votre projet
  function_url TEXT;
  service_key TEXT;
BEGIN
  -- Construire l'URL de l'Edge Function
  function_url := supabase_url || '/functions/v1/index-vocabulary';
  
  -- Récupérer la service role key depuis les settings (optionnel)
  -- Si pas de service key, le trigger utilisera l'anon key (moins sécurisé mais fonctionne)
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;
  
  -- Si pas de service key, essayer l'anon key
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
    RAISE NOTICE '✅ Trigger index-vocabulary appelé pour vocabulaire %', NEW.id;
  ELSE
    RAISE WARNING '⚠️ Service key non configurée, impossible d''appeler index-vocabulary pour le vocabulaire %', NEW.id;
    RAISE NOTICE '💡 Le fallback frontend (vocabularyService.ts) s''en chargera';
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'opération
    RAISE WARNING 'Erreur lors de l''appel de index-vocabulary pour le vocabulaire %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION trigger_index_vocabulary IS 'Déclenche l''indexation automatique d''une entrée de vocabulaire via l''Edge Function index-vocabulary (URL en dur)';

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez ce script pour mettre à jour le trigger
-- 2. Le trigger utilisera maintenant l'URL Supabase directement
-- 3. Si vous voulez utiliser la service key, configurez-la via:
--    ALTER ROLE postgres SET app.settings.service_role_key = 'VOTRE_KEY';
--    (Mais ce n'est pas obligatoire, le fallback frontend fonctionnera)
-- ============================================================================

