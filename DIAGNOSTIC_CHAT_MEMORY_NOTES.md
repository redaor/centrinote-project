# Diagnostic : Pourquoi chat-memory ne trouve pas les notes indexées

## ✅ Ce qui fonctionne

1. **L'indexation fonctionne** : L'Edge Function `index-note` est appelée (code 200)
2. **Les chunks sont créés** : "Chunks indexés avec succès { chunkCount: 1 }"
3. **Les embeddings sont générés** : OpenAI retourne les embeddings

## ❌ Le problème

L'IA ne trouve pas les notes dans `chat-memory`, même si elles sont indexées.

## 🔍 Causes possibles

### 1. Format des embeddings dans la recherche

Dans `chat-memory`, l'embedding est passé comme string :
```typescript
const embeddingString = `[${queryEmbedding.join(",")}]`;
```

Mais la fonction SQL `search_note_chunks` attend un `VECTOR(1536)`. Supabase devrait convertir automatiquement, mais vérifions.

### 2. Seuil de similarité trop élevé

Le seuil par défaut est `0.7` (70% de similarité), ce qui peut être trop strict.

### 3. La fonction RPC n'est pas appelée ou échoue silencieusement

Vérifiez les logs de `chat-memory` pour voir s'il y a des erreurs.

## 🧪 Tests à effectuer

### Test 1 : Vérifier que les chunks existent avec embeddings

```sql
SELECT 
  n.id,
  n.title,
  COUNT(c.id) as chunk_count,
  COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as chunks_with_embedding
FROM notes n
LEFT JOIN note_chunks_embeddings c ON c.note_id = n.id
WHERE n."userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  AND n.title LIKE '%travailler%'
GROUP BY n.id, n.title;
```

### Test 2 : Vérifier le format des embeddings

```sql
SELECT 
  id,
  chunk_index,
  pg_typeof(embedding) as embedding_type,
  array_length(embedding::float[], 1) as dimensions
FROM note_chunks_embeddings
WHERE note_id = (
  SELECT id FROM notes 
  WHERE title LIKE '%travailler%' 
  AND "userId" = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'
  LIMIT 1
)
LIMIT 1;
```

**Résultat attendu :**
- `embedding_type` : `vector` ou `USER-DEFINED`
- `dimensions` : `1536`

### Test 3 : Tester la fonction search_note_chunks directement

```sql
-- Utiliser un embedding existant comme requête de test
SELECT * FROM search_note_chunks(
  'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5'::uuid,
  (SELECT embedding FROM note_chunks_embeddings 
   WHERE user_id = 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5' 
   LIMIT 1),
  10,
  0.5, -- Réduire le seuil à 0.5 pour plus de résultats
  NULL
);
```

**Si ça retourne des résultats** → La fonction SQL fonctionne ✅
**Si ça retourne vide** → Problème avec les embeddings ou le seuil ❌

### Test 4 : Vérifier les logs de chat-memory

Dans Supabase Dashboard > Edge Functions > chat-memory > Logs, cherchez :
- `"Erreur recherche chunks de notes"` → Erreur dans la fonction RPC
- `"Chunks de notes récupérés"` → Nombre de chunks trouvés

## 🔧 Solutions

### Solution 1 : Réduire le seuil de similarité

Dans `chat-memory/index.ts`, ligne 35, changez :

```typescript
const MIN_NOTE_SIMILARITY = 0.5; // Au lieu de 0.7
```

Puis redéployez :
```bash
supabase functions deploy chat-memory
```

### Solution 2 : Vérifier le format de l'embedding dans chat-memory

Le format string `[1,2,3,...]` devrait fonctionner, mais vérifions que Supabase le convertit bien en VECTOR.

### Solution 3 : Ajouter plus de logs dans chat-memory

Ajoutez des logs pour voir ce qui se passe :

```typescript
// Dans retrieveRelevantNoteChunks
logger.info(`Recherche chunks de notes`, {
  userId: userId.substring(0, 8) + "...",
  embeddingLength: queryEmbedding.length,
  limit,
  minSimilarity
});

const { data, error } = await supabase
  .rpc("search_note_chunks", {
    p_user_id: userId,
    p_query_embedding: embeddingString,
    p_limit: limit,
    p_similarity_threshold: minSimilarity,
    p_tag_filter: null
  });

logger.info(`Résultat recherche chunks`, {
  resultCount: data?.length || 0,
  error: error?.message,
  firstResult: data?.[0] ? {
    note_id: data[0].note_id,
    similarity: data[0].similarity,
    chunk_preview: data[0].chunk_text.substring(0, 50)
  } : null
});
```

### Solution 4 : Vérifier que la fonction search_note_chunks existe

```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'search_note_chunks';
```

**Si aucune ligne** → La fonction n'existe pas, exécutez la migration `20251202_create_note_chunks_embeddings.sql`

## 🎯 Solution rapide recommandée

1. **Réduire le seuil de similarité** à 0.5 dans `chat-memory`
2. **Vérifier les logs** de `chat-memory` pour voir les erreurs
3. **Tester la fonction SQL** directement avec le script `TEST_RECHERCHE_NOTES.sql`

## 📊 Checklist

- [ ] Les chunks existent dans `note_chunks_embeddings`
- [ ] Les embeddings sont au format `vector(1536)`
- [ ] La fonction `search_note_chunks` existe
- [ ] La fonction `search_note_chunks` retourne des résultats en test direct
- [ ] Les logs de `chat-memory` montrent des erreurs ou 0 chunks trouvés
- [ ] Le seuil de similarité n'est pas trop élevé

