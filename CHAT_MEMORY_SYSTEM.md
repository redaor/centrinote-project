# Système de Mémoire de Conversation avec pgvector

## Vue d'ensemble

Ce système implémente une mémoire persistante et intelligente pour les conversations IA, utilisant:
- **pgvector** pour la recherche sémantique
- **Embeddings OpenAI** pour la représentation vectorielle
- **Résumés périodiques** pour gérer les conversations longues
- **Recherche hybride** (récente + sémantique) pour un contexte optimal

## Architecture

### Tables de base de données

1. **`conversations`**: Stocke les sessions de chat
   - `id` (UUID)
   - `user_id` (UUID)
   - `title` (TEXT)
   - `created_at`, `updated_at`

2. **`messages`**: Stocke les messages avec embeddings
   - `id` (UUID)
   - `conversation_id` (UUID)
   - `user_id` (UUID, nullable)
   - `role` ('user' | 'assistant' | 'system')
   - `content` (TEXT)
   - `embedding` (VECTOR(1536)) - **pgvector**
   - `is_summarized` (BOOLEAN)
   - `created_at`

3. **`conversation_summaries`**: Résumés périodiques
   - `id` (UUID)
   - `conversation_id` (UUID)
   - `summary` (TEXT)
   - `message_count` (INTEGER)
   - `created_at`

### Fonctions SQL

- `search_semantic_messages()`: Recherche sémantique par similarité cosinus
- `get_recent_messages()`: Récupère les N derniers messages
- `update_conversation_updated_at()`: Trigger pour mettre à jour `updated_at`

## Edge Function: `chat-memory`

### Endpoint

```
POST /functions/v1/chat-memory
```

### Payload de requête

```json
{
  "user_id": "uuid-de-l-utilisateur",
  "conversation_id": "uuid-de-la-conversation-ou-null",
  "message": "Message de l'utilisateur"
}
```

### Réponse

```json
{
  "success": true,
  "conversation_id": "uuid-de-la-conversation",
  "response": "Réponse de l'assistant",
  "metadata": {
    "recent_messages_count": 15,
    "semantic_messages_count": 8,
    "summaries_count": 2,
    "total_tokens_estimate": 3200
  }
}
```

## Flux de traitement

1. **Création/Récupération de conversation**
   - Si `conversation_id` fourni → vérifier existence
   - Sinon → créer nouvelle conversation avec titre basé sur le premier message

2. **Sauvegarde du message utilisateur**
   - Insérer dans `messages` avec `role='user'`
   - Générer embedding via OpenAI
   - Stocker l'embedding dans la colonne `embedding`

3. **Récupération de la mémoire contextuelle**
   - **Messages récents**: Derniers N messages (défaut: 20)
   - **Recherche sémantique**: K messages les plus pertinents par similarité cosinus
   - **Résumés**: Derniers résumés de conversation (max 3)

4. **Construction du prompt**
   - Message système décrivant le rôle et la mémoire
   - Bloc "mémoire long terme" (résumés)
   - Bloc "contexte sémantique" (messages pertinents)
   - Bloc "conversation récente" (derniers échanges)
   - Message utilisateur actuel

5. **Appel LLM**
   - Modèle: `gpt-4o-mini` (configurable)
   - Temperature: 0.7
   - Max tokens: 2000

6. **Sauvegarde de la réponse**
   - Insérer dans `messages` avec `role='assistant'`
   - Générer et stocker l'embedding

7. **Résumé périodique** (si nécessaire)
   - Si ≥ 50 messages non résumés → générer résumé
   - Marquer les messages comme résumés
   - Stocker le résumé dans `conversation_summaries`

## Configuration

### Variables d'environnement (Supabase Secrets)

```bash
OPENAI_API_KEY=sk-...
```

### Paramètres configurables

Dans `chat-memory/index.ts`:

```typescript
const MAX_RECENT_MESSAGES = 20;        // Messages récents
const MAX_SEMANTIC_RESULTS = 10;      // Résultats sémantiques
const MAX_CONVERSATION_MESSAGES = 50; // Seuil pour résumé
const MAX_TOKENS_ESTIMATE = 8000;     // Limite tokens
const CHAT_MODEL = "gpt-4o-mini";     // Modèle LLM
const EMBEDDING_MODEL = "text-embedding-3-small"; // Modèle embedding
```

## Installation

### 1. Appliquer la migration SQL

```bash
# Via Supabase Dashboard
# Ou via CLI:
supabase db push
```

### 2. Déployer l'Edge Function

```bash
supabase functions deploy chat-memory
```

### 3. Configurer les secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Exemple d'utilisation

### Requête

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": null,
    "message": "Bonjour, je m'appelle Alice et j'aime le développement web"
  }'
```

### Réponse

```json
{
  "success": true,
  "conversation_id": "789e0123-e89b-12d3-a456-426614174001",
  "response": "Bonjour Alice ! Ravi de faire votre connaissance. Je serai ravi de vous aider avec le développement web. Sur quoi souhaitez-vous travailler aujourd'hui ?",
  "metadata": {
    "recent_messages_count": 1,
    "semantic_messages_count": 0,
    "summaries_count": 0,
    "total_tokens_estimate": 150
  }
}
```

### Conversation suivante (avec mémoire)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": "789e0123-e89b-12d3-a456-426614174001",
    "message": "Quel framework me recommanderais-tu ?"
  }'
```

L'IA se souviendra qu'Alice aime le développement web et adaptera sa réponse.

## Performance et limites

### Optimisations

- **Index HNSW** sur `embedding` pour recherche sémantique rapide
- **Index partiels** sur `is_summarized` pour filtrer efficacement
- **Cache des embeddings** (pas de régénération si déjà présent)
- **Résumés asynchrones** (ne bloquent pas la réponse)

### Limites

- **Taille des embeddings**: 1536 dimensions (OpenAI text-embedding-3-small)
- **Limite tokens**: Estimation basée sur caractères (ratio 1:4)
- **Résumés**: Déclenchés tous les 50 messages
- **Recherche sémantique**: Max 10 résultats par défaut

### Gestion d'erreurs

- Erreurs d'embedding → continue sans embedding (pas de recherche sémantique)
- Erreurs de résumé → non bloquant (log uniquement)
- Erreurs réseau OpenAI → retourne erreur claire au frontend

## Sécurité

- **RLS activé** sur toutes les tables
- **Politiques**: Utilisateurs voient uniquement leurs conversations
- **Service role**: Accès complet pour les Edge Functions
- **Validation**: Vérification `user_id` et `conversation_id`

## Tests

### Test de création de conversation

```typescript
const response = await fetch('/functions/v1/chat-memory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  },
  body: JSON.stringify({
    user_id: 'test-user-id',
    conversation_id: null,
    message: 'Premier message de test'
  })
});
```

### Test de recherche sémantique

1. Créer plusieurs conversations avec des sujets similaires
2. Envoyer un message dans une nouvelle conversation
3. Vérifier que `semantic_messages_count > 0` dans les métadonnées

### Test de résumé

1. Envoyer 50+ messages dans une conversation
2. Vérifier qu'un résumé est généré (logs)
3. Vérifier que `is_summarized = true` sur les messages résumés

## Maintenance

### Nettoyage des anciennes conversations

```sql
-- Supprimer les conversations inactives depuis > 90 jours
DELETE FROM conversations
WHERE updated_at < NOW() - INTERVAL '90 days';
```

### Monitoring

- Surveiller la taille de la table `messages` (index vectoriel peut être volumineux)
- Surveiller les coûts OpenAI (embeddings + chat)
- Surveiller les temps de réponse de la recherche sémantique

## Améliorations futures

- [ ] Support streaming pour réponses longues
- [ ] Cache des embeddings côté Supabase
- [ ] Compression des embeddings (quantization)
- [ ] Support multi-langues avec détection automatique
- [ ] Fine-tuning du modèle pour le domaine spécifique
- [ ] Analytics sur l'utilisation de la mémoire

