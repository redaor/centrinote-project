-- ============================================================================
-- Indexer le vocabulaire existant
-- ============================================================================
-- Ce script liste le vocabulaire existant qui n'est pas encore indexé
-- Vous devrez ensuite appeler l'Edge Function index-vocabulary pour chaque entrée
-- ============================================================================

-- 1. Lister le vocabulaire non indexé
SELECT 
  v.id,
  v.word,
  v.definition,
  v.updated_at,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Indexé'
    ELSE '❌ Non indexé'
  END AS indexation_status
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'  -- Votre user_id
ORDER BY v.updated_at DESC;

-- 2. Compter le vocabulaire indexé vs non indexé
SELECT 
  COUNT(*) AS total_vocabularies,
  COUNT(CASE WHEN c.id IS NOT NULL THEN 1 END) AS vocabularies_indexes,
  COUNT(CASE WHEN c.id IS NULL THEN 1 END) AS vocabularies_non_indexes
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';

-- ============================================================================
-- Instructions pour indexer:
-- ============================================================================
-- Option 1: Via l'interface (recommandé)
--   - Modifiez un vocabulaire existant dans l'interface
--   - Le trigger SQL ou le fallback frontend l'indexera automatiquement
--
-- Option 2: Via l'Edge Function manuellement
--   - Allez dans Supabase Dashboard > Edge Functions > index-vocabulary
--   - Cliquez sur "Invoke"
--   - Entrez le payload:
--     {
--       "vocabulary_id": "ID_DU_VOCABULAIRE",
--       "user_id": "f44ef9d5-7a30-45b3-911b-c7f63a44a2c5"
--     }
--   - Répétez pour chaque vocabulaire non indexé
--
-- Option 3: Via le frontend (automatique)
--   - Ajoutez ou modifiez un vocabulaire dans l'interface
--   - Le système indexera automatiquement
-- ============================================================================

