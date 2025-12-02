# Exemple de test pour le système de mémoire de conversation

## Prérequis

1. Migration SQL appliquée (`20251202_create_conversation_memory_system.sql`)
2. Edge Function déployée (`chat-memory`)
3. Secret `OPENAI_API_KEY` configuré dans Supabase

## Test 1: Création d'une nouvelle conversation

### Requête

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": null,
    "message": "Bonjour, je m'appelle Alice et je travaille comme développeuse React. J'aime particulièrement TypeScript et les hooks personnalisés."
  }'
```

### Réponse attendue

```json
{
  "success": true,
  "conversation_id": "789e0123-e89b-12d3-a456-426614174001",
  "response": "Bonjour Alice ! Ravi de faire votre connaissance. C'est formidable que vous travailliez avec React et TypeScript. Les hooks personnalisés sont effectivement un excellent moyen de réutiliser la logique. Sur quoi souhaitez-vous travailler aujourd'hui ?",
  "metadata": {
    "recent_messages_count": 1,
    "semantic_messages_count": 0,
    "summaries_count": 0,
    "total_tokens_estimate": 180
  }
}
```

## Test 2: Conversation avec mémoire (même conversation)

### Requête

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": "789e0123-e89b-12d3-a456-426614174001",
    "message": "Quel framework me recommanderais-tu pour un projet de grande envergure ?"
  }'
```

### Réponse attendue

L'IA devrait se souvenir qu'Alice est développeuse React et adapter sa réponse en conséquence.

```json
{
  "success": true,
  "conversation_id": "789e0123-e89b-12d3-a456-426614174001",
  "response": "Étant donné que vous travaillez déjà avec React et TypeScript, je vous recommanderais Next.js pour un projet de grande envergure. Il offre un excellent support TypeScript, le SSR/SSG, et une excellente DX. Avez-vous déjà envisagé cette option ?",
  "metadata": {
    "recent_messages_count": 2,
    "semantic_messages_count": 0,
    "summaries_count": 0,
    "total_tokens_estimate": 250
  }
}
```

## Test 3: Nouvelle conversation avec recherche sémantique

### Étape 1: Créer une première conversation sur un sujet

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": null,
    "message": "Je veux apprendre à utiliser Supabase avec React. Comment dois-je commencer ?"
  }'
```

Notez le `conversation_id` retourné (ex: `conv-1`).

### Étape 2: Créer une deuxième conversation sur un sujet similaire

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": null,
    "message": "Comment intégrer Supabase dans mon application React ?"
  }'
```

### Réponse attendue

La recherche sémantique devrait trouver des messages pertinents de la première conversation.

```json
{
  "success": true,
  "conversation_id": "conv-2",
  "response": "...",
  "metadata": {
    "recent_messages_count": 1,
    "semantic_messages_count": 2,  // ← Messages de la conversation précédente
    "summaries_count": 0,
    "total_tokens_estimate": 300
  }
}
```

## Test 4: Test de résumé automatique

Pour tester le système de résumé, vous devez envoyer 50+ messages dans une même conversation.

### Script de test (Node.js)

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const ANON_KEY = 'YOUR_ANON_KEY';
const USER_ID = '123e4567-e89b-12d3-a456-426614174000';

async function testSummaryGeneration() {
  let conversationId = null;
  
  // Créer une conversation
  const createRes = await fetch(`${SUPABASE_URL}/functions/v1/chat-memory`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: USER_ID,
      conversation_id: null,
      message: 'Premier message de test pour résumé'
    })
  });
  
  const createData = await createRes.json();
  conversationId = createData.conversation_id;
  console.log(`✅ Conversation créée: ${conversationId}`);
  
  // Envoyer 50 messages
  for (let i = 2; i <= 51; i++) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-memory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: USER_ID,
        conversation_id: conversationId,
        message: `Message numéro ${i} pour tester le système de résumé automatique.`
      })
    });
    
    const data = await res.json();
    console.log(`📝 Message ${i} envoyé`);
    
    // Attendre un peu pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ 50 messages envoyés. Vérifiez les logs pour voir si un résumé a été généré.');
}

testSummaryGeneration();
```

### Vérification dans la base de données

```sql
-- Vérifier qu'un résumé a été créé
SELECT * FROM conversation_summaries 
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY created_at DESC;

-- Vérifier que les messages sont marqués comme résumés
SELECT COUNT(*) FROM messages 
WHERE conversation_id = 'YOUR_CONVERSATION_ID' 
AND is_summarized = true;
```

## Test 5: Test d'erreur (API key manquante)

### Requête

```bash
# Sans OPENAI_API_KEY configuré
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "conversation_id": null,
    "message": "Test"
  }'
```

### Réponse attendue

```json
{
  "success": false,
  "conversation_id": "",
  "response": "",
  "error": "OPENAI_API_KEY manquante"
}
```

## Test 6: Test de validation (champs manquants)

### Requête

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/chat-memory \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "",
    "message": ""
  }'
```

### Réponse attendue

```json
{
  "success": false,
  "conversation_id": "",
  "response": "",
  "error": "user_id et message sont requis"
}
```

## Vérifications dans Supabase Dashboard

### 1. Vérifier les tables

```sql
-- Vérifier les conversations créées
SELECT id, user_id, title, created_at, updated_at 
FROM conversations 
ORDER BY created_at DESC 
LIMIT 10;

-- Vérifier les messages avec embeddings
SELECT id, conversation_id, role, 
       LENGTH(content) as content_length,
       embedding IS NOT NULL as has_embedding,
       is_summarized,
       created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 20;

-- Vérifier les résumés
SELECT id, conversation_id, 
       LENGTH(summary) as summary_length,
       message_count,
       created_at
FROM conversation_summaries 
ORDER BY created_at DESC;
```

### 2. Tester la recherche sémantique manuellement

```sql
-- Générer un embedding de test (remplacer par un vrai embedding)
SELECT * FROM search_semantic_messages(
  'YOUR_CONVERSATION_ID'::uuid,
  '[0.1, 0.2, ...]'::vector(1536),  -- Embedding de test
  10,
  ARRAY[]::uuid[]
);
```

## Notes importantes

1. **Coûts OpenAI**: Chaque message génère 2 embeddings (user + assistant) + 1 appel chat
2. **Performance**: La recherche sémantique peut être lente au début (index HNSW se construit progressivement)
3. **Limites**: Les résumés sont générés de manière asynchrone (non bloquant)
4. **Sécurité**: Vérifiez que les RLS policies fonctionnent correctement (utilisateurs ne voient que leurs conversations)

