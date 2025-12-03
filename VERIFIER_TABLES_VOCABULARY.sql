-- ============================================================================
-- Vérification: Tables nécessaires pour l'indexation du vocabulaire
-- ============================================================================

-- 1. Vérifier si la table vocabulary_chunks_embeddings existe
SELECT 
  'Existence table vocabulary_chunks_embeddings' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vocabulary_chunks_embeddings'
    ) THEN '✅ Table existe'
    ELSE '❌ Table N''EXISTE PAS - Migration non exécutée'
  END AS status;

-- 2. Vérifier si la table vocabulary existe
SELECT 
  'Existence table vocabulary' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'vocabulary'
    ) THEN '✅ Table existe'
    ELSE '❌ Table N''EXISTE PAS'
  END AS status;

-- 3. Vérifier si la fonction search_vocabulary_chunks existe
SELECT 
  'Existence fonction search_vocabulary_chunks' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'search_vocabulary_chunks'
    ) THEN '✅ Fonction existe'
    ELSE '❌ Fonction N''EXISTE PAS - Migration non exécutée'
  END AS status;

-- 4. Vérifier si l'extension pgvector est activée
SELECT 
  'Extension pgvector' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_extension 
      WHERE extname = 'vector'
    ) THEN '✅ Extension activée'
    ELSE '❌ Extension N''EST PAS activée'
  END AS status;

-- 5. Vérifier que la table a le bon type de vocabulary_id
SELECT 
  'Type vocabulary_id' AS check_type,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'bigint' THEN '✅ Type BIGINT (compatible avec vocabulary.id)'
    WHEN data_type = 'uuid' THEN '✅ Type UUID (compatible avec vocabulary.id)'
    ELSE '⚠️ Type inattendu: ' || data_type
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vocabulary_chunks_embeddings'
  AND column_name = 'vocabulary_id';

-- ============================================================================
-- Instructions:
-- ============================================================================
-- Si la table n'existe pas, exécutez la migration:
-- supabase/migrations/20251202_create_vocabulary_chunks_embeddings.sql
-- ============================================================================

