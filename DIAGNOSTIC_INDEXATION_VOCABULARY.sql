-- ============================================================================
-- Diagnostic: Indexation du Vocabulaire
-- ============================================================================
-- Ce script permet de diagnostiquer les problèmes d'indexation du vocabulaire
-- ============================================================================

-- 1. Vérifier que la table vocabulary_chunks_embeddings existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocabulary_chunks_embeddings')
    THEN '✅ Table vocabulary_chunks_embeddings existe'
    ELSE '❌ Table vocabulary_chunks_embeddings N''EXISTE PAS'
  END AS status_table;

-- 2. Vérifier que le trigger existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_index_vocabulary')
    THEN '✅ Trigger trigger_auto_index_vocabulary existe'
    ELSE '❌ Trigger trigger_auto_index_vocabulary N''EXISTE PAS'
  END AS status_trigger;

-- 3. Vérifier que pg_net est activé
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ Extension pg_net est activée'
    ELSE '❌ Extension pg_net N''EST PAS activée'
  END AS status_pg_net;

-- 4. Compter les entrées de vocabulaire vs les chunks indexés
SELECT 
  (SELECT COUNT(*) FROM public.vocabulary WHERE "userId" = 'VOTRE_USER_ID') AS total_vocabulary,
  (SELECT COUNT(*) FROM vocabulary_chunks_embeddings WHERE user_id = 'VOTRE_USER_ID') AS total_chunks_indexed,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.vocabulary WHERE "userId" = 'VOTRE_USER_ID') = 
         (SELECT COUNT(*) FROM vocabulary_chunks_embeddings WHERE user_id = 'VOTRE_USER_ID')
    THEN '✅ Tous les vocabulaires sont indexés'
    ELSE '⚠️ Certains vocabulaires ne sont pas indexés'
  END AS status_indexation;

-- 5. Lister les vocabulaires non indexés
SELECT 
  v.id,
  v.word,
  v.definition,
  v.updated_at,
  CASE 
    WHEN c.id IS NULL THEN '❌ Non indexé'
    ELSE '✅ Indexé'
  END AS status
FROM public.vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'VOTRE_USER_ID'
ORDER BY v.updated_at DESC
LIMIT 20;

-- 6. Vérifier les détails du trigger
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgenabled AS enabled,
  tgtype::text AS trigger_type
FROM pg_trigger
WHERE tgname = 'trigger_auto_index_vocabulary';

-- 7. Vérifier la fonction trigger_index_vocabulary
SELECT 
  proname AS function_name,
  prosrc AS function_source
FROM pg_proc
WHERE proname = 'trigger_index_vocabulary';

-- 8. Vérifier les settings Supabase (si configurés)
SELECT 
  name,
  setting,
  CASE 
    WHEN name = 'app.settings.supabase_url' AND setting IS NOT NULL THEN '✅ Configuré'
    WHEN name = 'app.settings.supabase_url' AND setting IS NULL THEN '❌ Non configuré'
    ELSE 'N/A'
  END AS status
FROM pg_settings
WHERE name LIKE 'app.settings%';

-- 9. Vérifier les dernières requêtes pg_net (si disponibles)
SELECT 
  id,
  url,
  method,
  status_code,
  created_at
FROM net.http_request_queue
ORDER BY created_at DESC
LIMIT 10;

-- 10. Test manuel: Appeler la fonction trigger pour un vocabulaire spécifique
-- (Remplacez VOCABULARY_ID par un ID réel)
/*
DO $$
DECLARE
  test_vocab_id UUID := 'VOCABULARY_ID';
  test_user_id UUID := 'VOTRE_USER_ID';
BEGIN
  -- Simuler un INSERT
  PERFORM trigger_index_vocabulary() FROM (
    SELECT test_vocab_id AS id, test_user_id AS "userId"
  ) AS NEW;
  
  RAISE NOTICE 'Test d''indexation déclenché pour vocabulaire %', test_vocab_id;
END $$;
*/

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Remplacez 'VOTRE_USER_ID' par votre vrai user_id
-- 2. Remplacez 'VOCABULARY_ID' dans le test manuel par un ID réel
-- 3. Exécutez chaque requête une par une
-- 4. Vérifiez les résultats pour identifier le problème
-- ============================================================================

