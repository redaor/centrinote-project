-- ============================================================================
-- Diagnostic : Vérifier le contenu réel des chunks
-- ============================================================================

-- 1. Vérifier le contenu de la note originale
SELECT 
  id,
  title,
  content,
  LENGTH(content) as content_length,
  LENGTH(title) as title_length
FROM notes
WHERE "userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND title LIKE '%travailler%'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Vérifier le contenu des chunks indexés pour cette note
SELECT 
  c.id,
  c.note_id,
  c.chunk_index,
  c.chunk_text,
  LENGTH(c.chunk_text) as chunk_length,
  n.title as note_title,
  n.content as note_content_original
FROM note_chunks_embeddings c
INNER JOIN notes n ON n.id = c.note_id
WHERE c.user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND n.title LIKE '%travailler%'
ORDER BY c.note_id, c.chunk_index;

-- 3. Comparer le contenu de la note avec le chunk
-- (Pour voir si le chunk contient bien tout le contenu)
SELECT 
  n.id as note_id,
  n.title,
  n.content as note_content,
  c.chunk_text as chunk_content,
  CASE 
    WHEN c.chunk_text LIKE '%' || n.content || '%' THEN 'Le chunk contient le contenu'
    WHEN n.content LIKE '%' || c.chunk_text || '%' THEN 'Le contenu contient le chunk'
    ELSE 'Pas de correspondance directe'
  END as correspondance
FROM notes n
INNER JOIN note_chunks_embeddings c ON c.note_id = n.id
WHERE n."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND n.title LIKE '%travailler%'
LIMIT 5;

-- 4. Vérifier si le chunk ne contient que le titre
SELECT 
  c.id,
  c.note_id,
  c.chunk_index,
  c.chunk_text,
  n.title,
  CASE 
    WHEN c.chunk_text = n.title THEN 'Le chunk = titre uniquement'
    WHEN c.chunk_text LIKE n.title || '%' THEN 'Le chunk commence par le titre'
    ELSE 'Le chunk contient plus que le titre'
  END as analyse
FROM note_chunks_embeddings c
INNER JOIN notes n ON n.id = c.note_id
WHERE c.user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND n.title LIKE '%travailler%';

