# Fix : Format de l'embedding dans chat-memory

## 🔍 Problème identifié

Dans le Test 3 SQL, vous avez utilisé un embedding existant directement (type `vector`), et ça fonctionne.

Mais dans `chat-memory`, on passe l'embedding comme string `[1,2,3,...]`, et Supabase doit le convertir en `vector(1536)`.

## ✅ Solution

Le format string devrait fonctionner, mais vérifions que Supabase le convertit correctement.

### Option 1 : Vérifier le format (recommandé)

Le code actuel dans `chat-memory` :
```typescript
const embeddingString = `[${queryEmbedding.join(",")}]`;
```

Ce format est correct pour Supabase, qui devrait convertir automatiquement.

### Option 2 : Utiliser le format array directement

Si le format string ne fonctionne pas, on peut essayer de passer directement l'array :

```typescript
// Au lieu de :
const embeddingString = `[${queryEmbedding.join(",")}]`;

// Essayer :
const embeddingArray = queryEmbedding; // Array de numbers
```

Mais Supabase RPC attend généralement une string pour les types vector.

## 🧪 Test pour vérifier

Après avoir redéployé `chat-memory`, vérifiez les logs. Vous devriez voir :

1. `"Recherche chunks de notes"` avec `embeddingLength: 1536`
2. `"Résultat recherche chunks de notes"` avec `resultCount: 1` (ou plus)

Si `resultCount: 0` mais que le Test 3 SQL fonctionne, le problème vient du format de l'embedding.

## 🔧 Solution alternative : Forcer le format vector

Si le format string ne fonctionne pas, on peut utiliser une fonction SQL wrapper :

```sql
CREATE OR REPLACE FUNCTION search_note_chunks_from_string(
  p_user_id UUID,
  p_query_embedding_string TEXT, -- String au lieu de vector
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.5,
  p_tag_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  chunk_index INTEGER,
  chunk_text TEXT,
  similarity FLOAT,
  note_title TEXT,
  note_tags TEXT[],
  note_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM search_note_chunks(
    p_user_id,
    p_query_embedding_string::vector(1536), -- Convertir la string en vector
    p_limit,
    p_similarity_threshold,
    p_tag_filter
  );
END;
$$ LANGUAGE plpgsql;
```

Puis dans `chat-memory`, appeler cette nouvelle fonction au lieu de `search_note_chunks`.

Mais normalement, Supabase devrait gérer la conversion automatiquement.

