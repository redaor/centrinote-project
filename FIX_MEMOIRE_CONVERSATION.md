# Fix: Mémoire de conversation non fonctionnelle

## Problème identifié

L'IA ne se souvenait pas des conversations précédentes car le frontend utilisait l'ancienne Edge Function `ai-chat` au lieu de la nouvelle `chat-memory` avec système de mémoire persistante.

## Solution implémentée

### 1. Nouveau service `chatMemoryService`

Créé `src/services/chatMemoryService.ts` qui :
- Appelle l'Edge Function `chat-memory` (avec mémoire persistante)
- Gère le `conversation_id` dans localStorage
- Maintient la continuité entre les messages

### 2. Modification de `AIChat.tsx`

- Remplacement de `sendEdgeMessage` (ancien système) par `chatMemoryService.sendMessage`
- Gestion du `conversation_id` pour maintenir la continuité
- Fallback vers l'ancien système si `chat-memory` échoue

## Vérification

### 1. Déployer la migration SQL

```bash
# Appliquer la migration dans Supabase Dashboard
# Fichier: supabase/migrations/20251202_create_conversation_memory_system.sql
```

### 2. Déployer l'Edge Function

```bash
supabase functions deploy chat-memory
```

### 3. Configurer le secret

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 4. Tester

1. Envoyer un premier message : "Je m'appelle Alice et j'aime le développement React"
2. Envoyer un second message : "Quel framework me recommanderais-tu ?"
3. L'IA devrait se souvenir qu'Alice aime React et adapter sa réponse

## Structure des données

- **Table `conversations`** : Stocke les sessions de chat
- **Table `messages`** : Stocke les messages avec embeddings (pgvector)
- **Table `conversation_summaries`** : Résumés périodiques pour conversations longues

## Fonctionnalités

✅ Mémoire persistante entre sessions  
✅ Recherche sémantique (retrouve des messages pertinents même dans d'autres conversations)  
✅ Résumés automatiques pour conversations longues (≥50 messages)  
✅ Gestion intelligente des limites de tokens  

## Notes

- Le `conversation_id` est stocké dans localStorage par utilisateur
- Si l'utilisateur efface les messages, le `conversation_id` est réinitialisé
- Les embeddings sont générés automatiquement pour chaque message
- La recherche sémantique trouve les messages les plus pertinents par similarité cosinus

