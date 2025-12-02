# Système RAG pour le Vocabulaire Centrinote

## 📋 Vue d'ensemble

Ce système permet à l'IA de Centrinote d'accéder et d'utiliser le vocabulaire personnel de l'utilisateur de la même manière que pour les notes. L'IA peut maintenant :

- ✅ Rechercher sémantiquement dans le vocabulaire
- ✅ Répondre aux questions sur les définitions
- ✅ Reconnaître le "dernier vocabulaire" ajouté
- ✅ Utiliser le vocabulaire comme source de connaissances

## 🏗️ Architecture

### 1. Table `vocabulary_chunks_embeddings`

Stocke les entrées de vocabulaire avec leurs embeddings vectoriels :

```sql
vocabulary_chunks_embeddings (
  id UUID,
  vocabulary_id UUID → vocabulary(id),
  user_id UUID → auth.users(id),
  chunk_text TEXT,        -- word + definition + examples
  embedding VECTOR(1536),  -- Embedding OpenAI
  metadata JSONB,         -- category, difficulty, mastery, etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### 2. Edge Function `index-vocabulary`

**Rôle** : Indexe une entrée de vocabulaire en générant un embedding.

**Déclenchement** :
- Automatique via trigger SQL lors de la création/mise à jour d'une entrée
- Manuel via appel direct depuis le frontend (fallback)

**Processus** :
1. Récupère l'entrée de vocabulaire depuis `vocabulary`
2. Formate le texte : `word + pronunciation + definition + examples + category`
3. Génère l'embedding via OpenAI `text-embedding-3-small`
4. Supprime l'ancien chunk et insère le nouveau dans `vocabulary_chunks_embeddings`

### 3. Fonction SQL `search_vocabulary_chunks`

Recherche sémantique par similarité cosinus :

```sql
search_vocabulary_chunks(
  p_user_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7,
  p_category_filter TEXT DEFAULT NULL
)
```

Retourne les entrées de vocabulaire les plus pertinentes avec leurs métadonnées.

### 4. Intégration dans `chat-memory`

L'Edge Function `chat-memory` a été modifiée pour :

1. **Rechercher dans le vocabulaire** : Appelle `retrieveRelevantVocabularyChunks()` avec l'embedding de la requête
2. **Récupérer le dernier vocabulaire** : Si aucune entrée n'est trouvée, récupère la dernière entrée ajoutée
3. **Injecter dans le prompt** : Ajoute une section "VOCABULAIRE CENTRINOTE PERTINENT" dans le prompt système
4. **Citer les sources** : L'IA cite le mot de vocabulaire utilisé

## 📦 Installation

### Étape 1 : Migration SQL

Exécutez la migration pour créer la table et les fonctions :

```sql
-- Dans Supabase Dashboard > SQL Editor
-- Exécutez: supabase/migrations/20251202_create_vocabulary_chunks_embeddings.sql
```

### Étape 2 : Déployer l'Edge Function `index-vocabulary`

**Option A : Via Supabase Dashboard**

1. Allez dans **Edge Functions** > **Create a new function**
2. Nom : `index-vocabulary`
3. Copiez le code depuis `supabase/functions/index-vocabulary/index.ts`
4. Cliquez sur **Deploy**

**Option B : Via CLI**

```bash
supabase functions deploy index-vocabulary
```

### Étape 3 : Configurer le trigger SQL

Exécutez la migration pour créer le trigger automatique :

```sql
-- Dans Supabase Dashboard > SQL Editor
-- Exécutez: supabase/migrations/20251202_trigger_index_vocabulary.sql
```

**⚠️ IMPORTANT** : Modifiez `YOUR_PROJECT_REF` dans le fichier SQL avec votre vraie référence de projet Supabase.

### Étape 4 : Configurer les variables d'environnement

Dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets** :

- `OPENAI_API_KEY` : Votre clé API OpenAI

### Étape 5 : Redéployer `chat-memory`

L'Edge Function `chat-memory` a été modifiée pour intégrer le vocabulaire. Redéployez-la :

**Option A : Via Supabase Dashboard**

1. Allez dans **Edge Functions** > `chat-memory`
2. Copiez le code mis à jour depuis `supabase/functions/chat-memory/index.ts`
3. Cliquez sur **Deploy**

**Option B : Via CLI**

```bash
supabase functions deploy chat-memory
```

## 🧪 Test

### Test 1 : Indexation manuelle

```typescript
// Dans le frontend ou via Supabase Dashboard > Edge Functions > index-vocabulary > Invoke
{
  "vocabulary_id": "uuid-de-votre-vocabulaire",
  "user_id": "uuid-de-l-utilisateur"
}
```

Vérifiez dans `vocabulary_chunks_embeddings` qu'un chunk a été créé.

### Test 2 : Recherche sémantique

Posez une question à l'IA sur un mot de vocabulaire que vous avez ajouté :

```
"Qu'est-ce que [mot] ?"
"Peux-tu me donner la définition de [mot] ?"
"Quel est mon dernier vocabulaire ?"
```

L'IA devrait utiliser votre vocabulaire pour répondre.

### Test 3 : Vérification SQL

```sql
-- Vérifier qu'un chunk existe pour une entrée de vocabulaire
SELECT 
  v.word,
  v.definition,
  c.chunk_text,
  c.created_at
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'votre-user-id'
ORDER BY v.updated_at DESC
LIMIT 5;
```

## 🔧 Configuration

### Paramètres dans `chat-memory/index.ts`

```typescript
const MAX_VOCABULARY_CHUNKS = 5;              // Nombre max d'entrées de vocabulaire
const MIN_VOCABULARY_SIMILARITY = 0.5;       // Seuil de similarité minimum
```

### Formatage du texte de vocabulaire

Le texte indexé est formaté ainsi :

```
Mot: [word]
Prononciation: [pronunciation] (si disponible)
Définition: [definition]
Exemples:
Exemple 1: [example1]
Exemple 2: [example2]
Catégorie: [category]
```

## 🐛 Dépannage

### Problème : Le vocabulaire n'est pas indexé

1. Vérifiez que le trigger existe :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_index_vocabulary';
   ```

2. Vérifiez les logs de l'Edge Function `index-vocabulary` dans Supabase Dashboard

3. Testez l'indexation manuelle :
   ```typescript
   // Appel direct à index-vocabulary
   ```

### Problème : L'IA ne trouve pas le vocabulaire

1. Vérifiez que des chunks existent :
   ```sql
   SELECT COUNT(*) FROM vocabulary_chunks_embeddings WHERE user_id = 'votre-user-id';
   ```

2. Vérifiez les logs de `chat-memory` pour voir si `retrieveRelevantVocabularyChunks` est appelé

3. Réduisez `MIN_VOCABULARY_SIMILARITY` si nécessaire (défaut: 0.5)

### Problème : Le trigger ne fonctionne pas

1. Vérifiez que `pg_net` est activé :
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

2. Vérifiez que l'URL Supabase est configurée dans `app.settings.supabase_url`

3. Vérifiez les warnings dans les logs PostgreSQL

## 📝 Notes

- **Performance** : L'indexation se fait en arrière-plan via `pg_net`, elle n'est pas bloquante
- **Fallback** : Si le trigger échoue, le frontend peut appeler `index-vocabulary` manuellement
- **Similarité** : Le seuil de 0.5 est plus permissif que pour les notes (0.7) car le vocabulaire est généralement plus court
- **Dernier vocabulaire** : Si aucune recherche sémantique ne trouve de résultat, l'IA récupère automatiquement la dernière entrée ajoutée

## ✅ Checklist de déploiement

- [ ] Migration SQL `20251202_create_vocabulary_chunks_embeddings.sql` exécutée
- [ ] Edge Function `index-vocabulary` déployée
- [ ] Migration SQL `20251202_trigger_index_vocabulary.sql` exécutée (avec `YOUR_PROJECT_REF` modifié)
- [ ] Variable d'environnement `OPENAI_API_KEY` configurée
- [ ] Edge Function `chat-memory` redéployée avec les modifications
- [ ] Test d'indexation manuelle réussi
- [ ] Test de recherche sémantique réussi
- [ ] Vérification SQL des chunks créés

