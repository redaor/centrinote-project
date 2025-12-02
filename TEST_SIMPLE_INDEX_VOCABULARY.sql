-- ============================================================================
-- TEST SIMPLE: Appel direct de l'Edge Function index-vocabulary
-- ============================================================================
-- Ce script teste l'appel de l'Edge Function avec des valeurs réelles
-- ============================================================================

-- ÉTAPE 1: Trouver un vocabulaire à tester
-- Remplacez VOTRE_USER_ID par votre user_id
SELECT 
  id AS vocabulary_id,
  word,
  definition,
  "userId" AS user_id,
  updated_at
FROM vocabulary
WHERE "userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'  -- Votre user_id
ORDER BY updated_at DESC
LIMIT 1;

-- ÉTAPE 2: Appeler l'Edge Function directement
-- Remplacez les valeurs ci-dessous par les résultats de l'étape 1
DO $$
DECLARE
  test_vocabulary_id UUID := 'VOCABULARY_ID_FROM_STEP_1';  -- Copiez l'ID de l'étape 1
  test_user_id UUID := 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';  -- Votre user_id
  supabase_url TEXT := 'https://wjzlicokhxitmeoxkjzv.supabase.co';
  function_url TEXT;
  service_key TEXT;
  response_id BIGINT;
BEGIN
  -- Construire l'URL
  function_url := supabase_url || '/functions/v1/index-vocabulary';
  
  -- Récupérer la service key depuis les settings
  BEGIN
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Service key non configurée. Exécutez: ALTER DATABASE postgres SET app.settings.service_role_key = ''VOTRE_KEY'';';
  END;
  
  RAISE NOTICE '🚀 Appel de l''Edge Function index-vocabulary';
  RAISE NOTICE '📝 Vocabulary ID: %', test_vocabulary_id;
  RAISE NOTICE '👤 User ID: %', test_user_id;
  RAISE NOTICE '🔗 URL: %', function_url;
  
  -- Appeler l'Edge Function
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
  
  RAISE NOTICE '✅ Requête HTTP envoyée. ID: %', response_id;
  RAISE NOTICE '📋 Vérifiez les logs dans Supabase Dashboard > Edge Functions > index-vocabulary > Logs';
  
END $$;

-- ÉTAPE 3: Vérifier que le chunk a été créé
-- Remplacez VOCABULARY_ID_FROM_STEP_1 par l'ID de l'étape 1
SELECT 
  v.word,
  v.definition,
  CASE 
    WHEN c.id IS NULL THEN '❌ Aucun chunk créé'
    ELSE '✅ Chunk créé'
  END AS status,
  c.chunk_text,
  c.created_at
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v.id = 'VOCABULARY_ID_FROM_STEP_1'  -- ID de l'étape 1
LIMIT 1;

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez l'ÉTAPE 1 pour trouver un vocabulaire à tester
-- 2. Copiez l'ID du vocabulaire et remplacez VOCABULARY_ID_FROM_STEP_1 dans l'ÉTAPE 2
-- 3. Configurez la service key si nécessaire:
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';
-- 4. Exécutez l'ÉTAPE 2 pour appeler l'Edge Function
-- 5. Vérifiez les logs dans Supabase Dashboard
-- 6. Exécutez l'ÉTAPE 3 pour vérifier que le chunk a été créé
-- ============================================================================

