-- ============================================================================
-- TEST: Appel manuel de l'Edge Function index-vocabulary
-- ============================================================================
-- Ce script permet de tester si l'Edge Function index-vocabulary fonctionne
-- ============================================================================

-- 1. Vérifier que pg_net est activé
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ Extension pg_net est activée'
    ELSE '❌ Extension pg_net N''EST PAS activée - Exécutez: CREATE EXTENSION IF NOT EXISTS pg_net;'
  END AS status_pg_net;

-- 2. Trouver un vocabulaire à tester (remplacez VOTRE_USER_ID)
SELECT 
  id,
  word,
  definition,
  "userId",
  updated_at
FROM vocabulary
WHERE "userId" = 'VOTRE_USER_ID'  -- Remplacez par votre user_id
ORDER BY updated_at DESC
LIMIT 5;

-- 3. Test manuel : Appeler l'Edge Function index-vocabulary
-- Remplacez VOCABULARY_ID et USER_ID par des valeurs réelles
DO $$
DECLARE
  test_vocabulary_id UUID := 'VOCABULARY_ID';  -- Remplacez par un ID réel
  test_user_id UUID := 'VOTRE_USER_ID';        -- Remplacez par votre user_id
  supabase_url TEXT;
  function_url TEXT;
  service_key TEXT;
  response_id BIGINT;
BEGIN
  -- Récupérer l'URL Supabase
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    -- Utiliser l'URL par défaut (remplacez YOUR_PROJECT_REF)
    supabase_url := 'https://YOUR_PROJECT_REF.supabase.co';
    RAISE NOTICE 'URL Supabase non configurée, utilisation de la valeur par défaut: %', supabase_url;
  END;
  
  -- Construire l'URL de l'Edge Function
  function_url := supabase_url || '/functions/v1/index-vocabulary';
  
  -- Récupérer la service role key
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;
  
  IF service_key IS NULL OR service_key = '' THEN
    RAISE EXCEPTION 'Service key non configurée. Configurez app.settings.service_role_key';
  END IF;
  
  RAISE NOTICE 'Appel de l''Edge Function index-vocabulary...';
  RAISE NOTICE 'URL: %', function_url;
  RAISE NOTICE 'Vocabulary ID: %', test_vocabulary_id;
  RAISE NOTICE 'User ID: %', test_user_id;
  
  -- Appeler l'Edge Function via pg_net
  SELECT id INTO response_id
  FROM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'vocabulary_id', test_vocabulary_id,
      'user_id', test_user_id
    )
  );
  
  RAISE NOTICE '✅ Requête HTTP envoyée avec succès. ID de la requête: %', response_id;
  RAISE NOTICE '📝 Vérifiez les logs dans Supabase Dashboard > Edge Functions > index-vocabulary > Logs';
  
END $$;

-- 4. Vérifier les requêtes HTTP récentes (si pg_net est configuré)
SELECT 
  id,
  url,
  method,
  status_code,
  created_at,
  error_msg
FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 10;

-- 5. Vérifier si un chunk a été créé pour le vocabulaire testé
-- (Remplacez VOCABULARY_ID par l'ID utilisé dans le test)
SELECT 
  v.word,
  v.definition,
  c.id AS chunk_id,
  c.chunk_text,
  c.created_at AS chunk_created_at,
  CASE 
    WHEN c.id IS NULL THEN '❌ Aucun chunk créé'
    ELSE '✅ Chunk créé avec succès'
  END AS status
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v.id = 'VOCABULARY_ID'  -- Remplacez par l'ID du vocabulaire testé
LIMIT 1;

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Remplacez 'VOTRE_USER_ID' par votre vrai user_id (dans les requêtes 2 et 3)
-- 2. Remplacez 'VOCABULARY_ID' par un ID de vocabulaire réel (dans la requête 3)
-- 3. Remplacez 'YOUR_PROJECT_REF' par votre référence de projet Supabase
-- 4. Configurez app.settings.service_role_key si nécessaire:
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';
-- 5. Exécutez les requêtes une par une
-- ============================================================================

