-- ============================================================================
-- Script de test pour vérifier pourquoi l'IA ne trouve pas les notes
-- ============================================================================

-- 1. Vérifier que la fonction search_note_chunks existe
SELECT 
  proname as function_name,
  pronargs as arg_count,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'search_note_chunks';

-- 2. Vérifier que les chunks sont bien indexés avec des embeddings
SELECT 
  n.id as note_id,
  n.title,
  n."userId",
  COUNT(c.id) as chunk_count,
  COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as chunks_with_embedding
FROM notes n
LEFT JOIN note_chunks_embeddings c ON c.note_id = n.id
WHERE n."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5' -- Votre user_id
GROUP BY n.id, n.title, n."userId"
ORDER BY n.updated_at DESC;

-- 3. Vérifier le format des embeddings (doit être vector(1536))
SELECT 
  id,
  note_id,
  chunk_index,
  LEFT(chunk_text, 50) as chunk_preview,
  pg_typeof(embedding) as embedding_type,
  (SELECT array_length(unnest::float[], 1) FROM unnest(string_to_array(embedding::text, ',')) LIMIT 1) as embedding_dimensions_approx
FROM note_chunks_embeddings
WHERE note_id IN (
  SELECT id FROM notes 
  WHERE "userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  ORDER BY updated_at DESC
  LIMIT 5
)
LIMIT 5;

-- Alternative : Vérifier simplement que les embeddings existent
SELECT 
  id,
  note_id,
  chunk_index,
  LEFT(chunk_text, 50) as chunk_preview,
  pg_typeof(embedding) as embedding_type,
  CASE 
    WHEN embedding IS NOT NULL THEN 'Embedding présent'
    ELSE 'Embedding manquant'
  END as embedding_status
FROM note_chunks_embeddings
WHERE note_id IN (
  SELECT id FROM notes 
  WHERE "userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  ORDER BY updated_at DESC
  LIMIT 5
)
LIMIT 5;

-- 4. Tester la fonction search_note_chunks avec un embedding de test
-- (Générer un embedding de test pour "le fait de travailler plus")
-- Note: Ceci est un embedding factice pour tester, en production on utilise OpenAI
SELECT * FROM search_note_chunks(
  'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'::uuid, -- user_id
  (SELECT embedding FROM note_chunks_embeddings LIMIT 1), -- Utiliser un embedding existant comme requête
  10, -- limit
  0.5, -- similarity threshold (réduire pour plus de résultats)
  NULL -- tag_filter
);

-- 5. Vérifier les logs de chat-memory pour voir les erreurs
-- (À vérifier dans Supabase Dashboard > Edge Functions > chat-memory > Logs)

-- 6. Vérifier que les RLS policies permettent l'accès
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'note_chunks_embeddings';

-- 7. Test simple : compter les chunks par utilisateur
SELECT 
  user_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT note_id) as notes_indexed
FROM note_chunks_embeddings
WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
GROUP BY user_id;

