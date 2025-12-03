-- ============================================================================
-- TEST: Vérification de l'indexation du vocabulaire
-- ============================================================================
-- Remplacez VOTRE_USER_ID par votre user_id
-- ============================================================================

-- 1. Vérifier que des chunks de vocabulaire existent
SELECT 
  'Chunks de vocabulaire' AS check_type,
  COUNT(*) AS total_chunks,
  COUNT(DISTINCT vocabulary_id) AS vocabularies_indexes,
  COUNT(DISTINCT user_id) AS users_concernes
FROM vocabulary_chunks_embeddings
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';  -- Votre user_id

-- 2. Voir le contenu des chunks indexés
SELECT 
  v.word,
  v.definition,
  c.chunk_text,
  LENGTH(c.chunk_text) AS chunk_length,
  c.created_at AS indexed_at,
  v.updated_at AS vocabulary_updated_at
FROM vocabulary_chunks_embeddings c
JOIN vocabulary v ON v.id = c.vocabulary_id
WHERE c.user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
ORDER BY v.updated_at DESC
LIMIT 10;

-- 3. Comparer avec les notes (pour référence)
SELECT 
  'Chunks de notes' AS check_type,
  COUNT(*) AS total_chunks,
  COUNT(DISTINCT note_id) AS notes_indexees
FROM note_chunks_embeddings
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';

-- 4. Vérifier le format du chunk_text pour vocabulaire
SELECT 
  v.word,
  SUBSTRING(c.chunk_text, 1, 200) AS chunk_preview,
  CASE 
    WHEN c.chunk_text LIKE '%Définition:%' THEN '✅ Format avec "Définition:"'
    WHEN c.chunk_text LIKE v.word THEN '✅ Commence par le mot'
    ELSE '⚠️ Format inattendu'
  END AS format_status
FROM vocabulary_chunks_embeddings c
JOIN vocabulary v ON v.id = c.vocabulary_id
WHERE c.user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
LIMIT 5;

-- 5. Vérifier les embeddings (dimensions)
SELECT 
  'Dimensions embeddings' AS check_type,
  array_length(embedding::float8[], 1) AS dimensions,
  COUNT(*) AS count
FROM vocabulary_chunks_embeddings
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
GROUP BY dimensions;

-- 6. Trouver le dernier vocabulaire ajouté
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
WHERE v."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
ORDER BY v.updated_at DESC
LIMIT 5;

