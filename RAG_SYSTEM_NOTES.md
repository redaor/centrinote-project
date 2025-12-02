# Système RAG pour les Notes Centrinote

## 📋 Vue d'ensemble

Ce système permet à l'IA de Centrinote de se rappeler de **toutes les notes** créées par l'utilisateur, pas seulement le vocabulaire. L'IA peut répondre à des questions en s'appuyant sur le contenu des notes, retrouver des définitions/explications stockées, et se souvenir de n'importe quelle note même si elle n'a jamais été évoquée en conversation.

## 🏗️ Architecture

### 1. Base de données

#### Table `note_chunks_embeddings`
Stocke les chunks de notes avec leurs embeddings vectoriels pour la recherche sémantique.

**Colonnes principales :**
- `id` (UUID)
- `note_id` (UUID, FK vers `notes`)
- `user_id` (UUID, FK vers `auth.users`)
- `chunk_index` (INTEGER) - Index du chunk dans la note (0, 1, 2, ...)
- `chunk_text` (TEXT) - Texte du chunk
- `embedding` (VECTOR(1536)) - Embedding OpenAI text-embedding-3-small
- `metadata` (JSONB) - Métadonnées (tags, langue, etc.)

**Index :**
- Index vectoriel HNSW sur `embedding` pour recherche rapide
- Index sur `note_id`, `user_id`, `created_at`
- Index composite `(user_id, note_id)`

#### Fonction SQL `search_note_chunks`
Recherche sémantique de chunks de notes par similarité cosinus.

**Paramètres :**
- `p_user_id` (UUID)
- `p_query_embedding` (VECTOR(1536))
- `p_limit` (INTEGER, défaut: 10)
- `p_similarity_threshold` (FLOAT, défaut: 0.7)
- `p_tag_filter` (TEXT[], optionnel)

**Retourne :**
- `id`, `note_id`, `chunk_index`, `chunk_text`, `similarity`
- `note_title`, `note_tags`, `note_updated_at`

### 2. Edge Functions

#### `index-note`
Indexe une note en la découpant en chunks et en générant des embeddings.

**Endpoint :** `POST /functions/v1/index-note`

**Body :**
```json
{
  "note_id": "uuid",
  "user_id": "uuid"
}
```

**Processus :**
1. Récupère la note (titre + contenu)
2. Récupère les tags de la note
3. Découpe la note en chunks (400 tokens par chunk, 50 tokens de chevauchement)
4. Génère les embeddings pour chaque chunk via OpenAI
5. Supprime les anciens chunks de la note
6. Insère les nouveaux chunks avec leurs embeddings

**Configuration :**
- `CHUNK_SIZE_TOKENS`: 400
- `CHUNK_OVERLAP_TOKENS`: 50
- `MIN_CHUNK_SIZE`: 50 caractères
- `EMBEDDING_MODEL`: `text-embedding-3-small` (1536 dimensions)

#### `chat-memory` (modifié)
Système de chat avec mémoire de conversation + recherche RAG dans les notes.

**Modifications :**
- Recherche les chunks de notes pertinents avant d'appeler le LLM
- Construit le prompt avec deux blocs de contexte :
  1. **Notes Centrinote trouvées** (priorité absolue)
  2. **Mémoire de conversation** (messages récents + sémantiques + résumés)
- Demande au LLM de se baser PRIORITAIREMENT sur les notes fournies
- Retourne la liste des notes utilisées dans `metadata.notes_used`

**Configuration :**
- `MAX_NOTE_CHUNKS`: 8 chunks maximum
- `MIN_NOTE_SIMILARITY`: 0.7 (score minimum de similarité)

### 3. Triggers SQL

#### `trigger_auto_index_note`
Déclenche automatiquement l'indexation d'une note après création ou mise à jour.

**Déclenchement :**
- `AFTER INSERT` sur `notes`
- `AFTER UPDATE OF title, content` sur `notes`

**Fonction :** `trigger_index_note()`
- Appelle l'Edge Function `index-note` via `pg_net`
- Non bloquant (en arrière-plan)

**Note :** Le trigger nécessite la configuration de `app.settings.supabase_url` et `app.settings.supabase_service_key` dans Supabase Dashboard.

### 4. Services Frontend

#### `noteIndexService.ts`
Service pour indexer manuellement les notes (fallback si le trigger ne fonctionne pas).

**Fonctions :**
- `indexNote(noteId, userId)` - Indexe une note
- `reindexAllNotesForUser(userId)` - Réindexe toutes les notes d'un utilisateur

**Intégration :**
- Appelé automatiquement dans `notesService.addNote()` et `notesService.updateNote()` (en arrière-plan, non bloquant)

## 🚀 Installation

### 1. Migrations SQL

Exécuter dans l'ordre :

1. **`20251202_create_note_chunks_embeddings.sql`**
   - Crée la table `note_chunks_embeddings`
   - Crée la fonction `search_note_chunks`
   - Configure RLS et index

2. **`20251202_trigger_index_note.sql`** (optionnel)
   - Crée le trigger pour indexation automatique
   - Nécessite `pg_net` extension

### 2. Edge Functions

Déployer les Edge Functions :

```bash
# Indexer les notes
supabase functions deploy index-note

# Chat avec mémoire (déjà déployé, mais mettre à jour)
supabase functions deploy chat-memory
```

### 3. Variables d'environnement

**Supabase Secrets :**
- `OPENAI_API_KEY` - Clé API OpenAI pour embeddings et chat

**Supabase Settings (pour le trigger) :**
- `app.settings.supabase_url` - URL de votre projet Supabase
- `app.settings.supabase_service_key` - Service role key (optionnel, le trigger peut utiliser l'auth JWT)

### 4. Indexation initiale

Pour indexer toutes les notes existantes :

```typescript
import { reindexAllNotesForUser } from './services/noteIndexService';

// Dans votre code admin ou script de migration
await reindexAllNotesForUser(userId);
```

## 📊 Flux d'utilisation

### 1. Création/Mise à jour d'une note

```
Utilisateur crée/modifie une note
    ↓
Trigger SQL (ou appel manuel) → index-note Edge Function
    ↓
Découpage en chunks (400 tokens)
    ↓
Génération embeddings (OpenAI)
    ↓
Stockage dans note_chunks_embeddings
```

### 2. Question à l'IA

```
Utilisateur pose une question
    ↓
chat-memory Edge Function
    ↓
Génération embedding de la question
    ↓
Recherche sémantique dans note_chunks_embeddings
    ↓
Récupération des K chunks les plus pertinents
    ↓
Construction du prompt (notes + mémoire conversation)
    ↓
Appel LLM avec contexte enrichi
    ↓
Retour de la réponse + liste des notes utilisées
```

## 🧪 Tests

### Test d'indexation

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/index-note \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "note_id": "uuid-de-la-note",
    "user_id": "uuid-de-l-utilisateur"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Note indexée avec succès",
  "chunk_count": 3,
  "tags": ["tag1", "tag2"]
}
```

### Test de recherche

```sql
-- Rechercher des chunks pertinents
SELECT * FROM search_note_chunks(
  'user-uuid',
  '[0.1, 0.2, ...]'::vector(1536), -- embedding de la requête
  10, -- limit
  0.7, -- similarity threshold
  NULL -- tag filter
);
```

### Test de chat avec notes

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "uuid",
    "conversation_id": "uuid-ou-null",
    "message": "Quelle est la définition de X dans mes notes ?"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "conversation_id": "uuid",
  "response": "D'après votre note 'Titre de la note', X est défini comme...",
  "metadata": {
    "note_chunks_count": 2,
    "notes_used": [
      {
        "note_id": "uuid",
        "title": "Titre de la note"
      }
    ],
    "recent_messages_count": 5,
    "semantic_messages_count": 3,
    "summaries_count": 1,
    "total_tokens_estimate": 3500
  }
}
```

## 🔧 Configuration avancée

### Ajuster la taille des chunks

Dans `supabase/functions/index-note/index.ts` :

```typescript
const CHUNK_SIZE_TOKENS = 400; // Augmenter pour des chunks plus longs
const CHUNK_OVERLAP_TOKENS = 50; // Augmenter pour plus de contexte
```

### Ajuster le nombre de chunks dans le chat

Dans `supabase/functions/chat-memory/index.ts` :

```typescript
const MAX_NOTE_CHUNKS = 8; // Augmenter pour plus de contexte
const MIN_NOTE_SIMILARITY = 0.7; // Réduire pour plus de résultats
```

### Filtrer par tags

Dans `chat-memory`, modifier `retrieveRelevantNoteChunks` :

```typescript
const noteChunks = await retrieveRelevantNoteChunks(
  user_id,
  queryEmbedding,
  MAX_NOTE_CHUNKS,
  MIN_NOTE_SIMILARITY,
  ['tag1', 'tag2'] // Filtrer par tags spécifiques
);
```

## 🐛 Dépannage

### Les notes ne sont pas indexées

1. Vérifier que le trigger est actif :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_index_note';
   ```

2. Vérifier les logs de l'Edge Function `index-note` dans Supabase Dashboard

3. Appeler manuellement l'indexation :
   ```typescript
   import { indexNote } from './services/noteIndexService';
   await indexNote(noteId, userId);
   ```

### L'IA ne trouve pas les notes

1. Vérifier que les embeddings sont générés :
   ```sql
   SELECT COUNT(*) FROM note_chunks_embeddings WHERE user_id = 'user-uuid';
   ```

2. Vérifier le score de similarité (peut être trop élevé) :
   ```typescript
   const MIN_NOTE_SIMILARITY = 0.6; // Réduire le seuil
   ```

3. Vérifier que la fonction `search_note_chunks` fonctionne :
   ```sql
   SELECT * FROM search_note_chunks(...);
   ```

### Erreur "OPENAI_API_KEY manquante"

Configurer la clé dans Supabase Dashboard > Settings > Edge Functions > Secrets

## 📈 Performance

- **Indexation :** ~1-2 secondes par note (selon la taille)
- **Recherche :** ~50-200ms (grâce à l'index HNSW)
- **Chat avec notes :** +200-500ms (génération embedding + recherche)

## 🔐 Sécurité

- RLS activé sur `note_chunks_embeddings` : les utilisateurs ne peuvent voir que leurs propres chunks
- Service role peut tout faire (pour les Edge Functions)
- Les embeddings sont générés côté serveur (pas exposés au client)

## 📝 Notes importantes

- Les notes vides ou très courtes (< 50 caractères) ne sont pas indexées
- Les chunks sont automatiquement supprimés si la note est supprimée (CASCADE)
- L'indexation est idempotente : réindexer une note supprime d'abord les anciens chunks
- Le trigger SQL peut être désactivé si vous préférez indexer manuellement

