-- ============================================================================
-- TEST DIRECT: Vérifier que le trigger fonctionne
-- ============================================================================
-- Ce script teste directement le trigger en créant un vocabulaire de test
-- ============================================================================

-- ÉTAPE 1: Vérifier l'état actuel
SELECT 
  'État avant test' AS etape,
  COUNT(*) AS nombre_vocabularies,
  COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) AS vocabularies_indexes
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';

-- ÉTAPE 2: Créer un vocabulaire de test
DO $$
DECLARE
  test_user_id UUID := 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';
  new_vocab_id UUID;
  test_word TEXT := 'test-trigger-' || EXTRACT(EPOCH FROM NOW())::TEXT;
BEGIN
  RAISE NOTICE '🚀 Création d''un vocabulaire de test...';
  
  -- Insérer un vocabulaire de test
  INSERT INTO vocabulary (
    "userId",
    word,
    definition,
    category
  ) VALUES (
    test_user_id,
    test_word,
    'Ceci est un test pour vérifier que le trigger index-vocabulary fonctionne. Si vous voyez ce message, le vocabulaire a été créé.',
    'Test'
  ) RETURNING id INTO new_vocab_id;
  
  RAISE NOTICE '✅ Vocabulaire créé avec ID: %', new_vocab_id;
  RAISE NOTICE '⏳ Attente de 5 secondes pour que le trigger s''exécute...';
  
  -- Attendre 5 secondes pour que le trigger s'exécute
  PERFORM pg_sleep(5);
  
  -- Vérifier si une requête HTTP a été créée
  IF EXISTS (
    SELECT 1 FROM net.http_request_queue
    WHERE url LIKE '%index-vocabulary%'
      AND created_at > NOW() - INTERVAL '10 seconds'
  ) THEN
    RAISE NOTICE '✅ Le trigger a appelé l''Edge Function !';
    
    -- Afficher les détails
    FOR rec IN (
      SELECT 
        id,
        url,
        method,
        created_at,
        error_msg
      FROM net.http_request_queue
      WHERE url LIKE '%index-vocabulary%'
        AND created_at > NOW() - INTERVAL '10 seconds'
      ORDER BY created_at DESC
      LIMIT 1
    ) LOOP
      RAISE NOTICE '📋 Requête HTTP ID: %', rec.id;
      RAISE NOTICE '📋 URL: %', rec.url;
      RAISE NOTICE '📋 Méthode: %', rec.method;
      RAISE NOTICE '📋 Créée à: %', rec.created_at;
      RAISE NOTICE '📋 Erreur: %', COALESCE(rec.error_msg, 'Aucune erreur');
    END LOOP;
  ELSE
    RAISE WARNING '❌ Aucun appel HTTP détecté. Le trigger ne fonctionne peut-être pas.';
    RAISE NOTICE '💡 Causes possibles:';
    RAISE NOTICE '   1. Les settings Supabase ne sont pas configurés';
    RAISE NOTICE '   2. La service key n''est pas valide';
    RAISE NOTICE '   3. pg_net n''est pas correctement configuré';
  END IF;
  
  -- Vérifier si un chunk a été créé
  IF EXISTS (
    SELECT 1 FROM vocabulary_chunks_embeddings
    WHERE vocabulary_id = new_vocab_id
  ) THEN
    RAISE NOTICE '✅ Chunk créé avec succès !';
  ELSE
    RAISE WARNING '⚠️ Aucun chunk créé. L''Edge Function n''a peut-être pas fonctionné.';
    RAISE NOTICE '💡 Vérifiez les logs dans Supabase Dashboard > Edge Functions > index-vocabulary';
  END IF;
  
  -- Nettoyer le vocabulaire de test (optionnel)
  -- DELETE FROM vocabulary WHERE id = new_vocab_id;
  -- RAISE NOTICE '🧹 Vocabulaire de test supprimé';
  
END $$;

-- ÉTAPE 3: Vérifier l'état après test
SELECT 
  'État après test' AS etape,
  COUNT(*) AS nombre_vocabularies,
  COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) AS vocabularies_indexes
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';

-- ÉTAPE 4: Vérifier les requêtes HTTP récentes
SELECT 
  id,
  url,
  method,
  created_at,
  error_msg,
  CASE 
    WHEN error_msg IS NULL THEN '✅ Succès'
    ELSE '❌ Erreur: ' || error_msg
  END AS status
FROM net.http_request_queue
WHERE url LIKE '%index-vocabulary%'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez toutes les étapes dans l'ordre
-- 2. Regardez les messages NOTICE pour voir ce qui se passe
-- 3. Si le trigger ne fonctionne pas, configurez les settings:
--    ALTER DATABASE postgres SET app.settings.supabase_url = 'https://wjzlicokhxitmeoxkjzv.supabase.co';
--    ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';
-- ============================================================================

