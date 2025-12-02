-- ============================================================================
-- Script de test pour indexer manuellement une note
-- ============================================================================
-- Utilisez ce script pour tester l'indexation sans passer par le trigger
-- ============================================================================

-- 1. Trouver une note à indexer
SELECT 
  id,
  title,
  "userId",
  LEFT(content, 100) as content_preview
FROM notes
WHERE "userId" = 'VOTRE_USER_ID' -- Remplacez par votre user_id
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Vérifier si cette note est déjà indexée
SELECT 
  COUNT(*) as chunk_count,
  SUM(LENGTH(chunk_text)) as total_chars
FROM note_chunks_embeddings
WHERE note_id = 'UUID_DE_LA_NOTE'; -- Remplacez par l'ID de la note

-- 3. Supprimer les anciens chunks (si vous voulez réindexer)
-- DELETE FROM note_chunks_embeddings WHERE note_id = 'UUID_DE_LA_NOTE';

-- 4. Appeler l'Edge Function manuellement via pg_net
-- Remplacez les valeurs suivantes :
-- - YOUR_PROJECT_REF : votre référence de projet Supabase
-- - YOUR_SERVICE_KEY : votre service role key (trouvable dans Settings > API)
-- - UUID_DE_LA_NOTE : l'ID de la note à indexer
-- - UUID_DE_L_UTILISATEUR : l'ID de l'utilisateur

SELECT
  net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-note',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_KEY'
    ),
    body := jsonb_build_object(
      'note_id', 'UUID_DE_LA_NOTE',
      'user_id', 'UUID_DE_L_UTILISATEUR'
    )
  ) as request_id;

-- 5. Vérifier le résultat (attendre quelques secondes)
SELECT 
  status,
  content,
  created
FROM net.http_response_queue
WHERE id = (
  SELECT id FROM net.http_response_queue 
  ORDER BY created DESC 
  LIMIT 1
);

-- 6. Vérifier que les chunks ont été créés
SELECT 
  id,
  chunk_index,
  LEFT(chunk_text, 100) as chunk_preview,
  created_at
FROM note_chunks_embeddings
WHERE note_id = 'UUID_DE_LA_NOTE'
ORDER BY chunk_index;

