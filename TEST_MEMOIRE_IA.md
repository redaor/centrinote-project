# 🧪 Test de la Mémoire Persistante entre Sessions

## 📋 Scénario de test

### Test 1 : Mémoire entre sessions

1. **Première session :**
   - Ouvrir l'onglet "Recherche IA"
   - Poser la question : "Quel est mon fruit préféré ?"
   - Répondre : "Mangue"
   - Attendre 5 messages (pour déclencher `ai-memory`)
   - Vérifier dans la console : `🧠 [useCentrinoteAI_Edge] Mémoire mise à jour (fire & forget) pour 5 messages`

2. **Vérification dans Supabase :**
   ```sql
   SELECT 
     user_id,
     session_id,
     summary,
     key_topics,
     language,
     updated_at
   FROM chat_memory
   WHERE user_id = 'VOTRE_USER_ID'
   ORDER BY updated_at DESC
   LIMIT 1;
   ```
   - Vérifier que `summary` contient "fruit préféré" ou "Mangue"
   - Vérifier que `key_topics` contient "fruit" ou "Mangue"

3. **Deuxième session (après rechargement) :**
   - Recharger la page (F5)
   - Ouvrir l'onglet "Recherche IA"
   - Poser la question : "Quel est mon fruit préféré ?"
   - **Résultat attendu :** L'IA doit répondre "Mangue" en se basant sur la mémoire persistante

### Test 2 : Vérification du chargement de la mémoire

1. **Vérifier les logs dans la console :**
   - `🧠 Mémoire chargée (dernière session): ...` doit apparaître au début de chaque requête
   - Si pas de mémoire : `ℹ️ Aucune mémoire trouvée pour cet utilisateur`

2. **Vérifier dans le prompt système :**
   - Le placeholder `{memory}` doit être remplacé par le résumé de la mémoire
   - Si pas de mémoire, `{memory}` doit être vide

### Test 3 : Appel ai-memory toutes les 5 messages

1. **Envoyer 5 messages :**
   - Message 1 : "Bonjour"
   - Message 2 : "Comment ça va ?"
   - Message 3 : "Quel temps fait-il ?"
   - Message 4 : "Merci"
   - Message 5 : "Au revoir"

2. **Vérifier les logs :**
   - Au 5ème message, doit apparaître : `🧠 [useCentrinoteAI_Edge] Mémoire mise à jour (fire & forget) pour 5 messages`
   - Au 10ème message, doit réapparaître

3. **Vérifier dans Supabase :**
   ```sql
   SELECT updated_at, summary, key_topics
   FROM chat_memory
   WHERE user_id = 'VOTRE_USER_ID'
   ORDER BY updated_at DESC;
   ```
   - `updated_at` doit être mis à jour toutes les 5 messages

## 🔍 Points de vérification

### 1. Chargement de la mémoire (ai-chat/index.ts)

✅ **Ligne ~139-145 :** Charge la dernière mémoire par `user_id` (pas `session_id`)
```typescript
const { data: memoryData, error: memoryError } = await supabase
  .from('chat_memory')
  .select('summary, key_topics, language, mood')
  .eq('user_id', user.id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .single();
```

✅ **Ligne ~371, ~465, ~561 :** Injection du placeholder `{memory}` dans les prompts
```typescript
const memoryContext = chatMemory?.summary 
  ? `\n\n{memory}\nRésumé des conversations précédentes : ${chatMemory.summary}...`
  : '\n\n{memory}\n';
```

### 2. Appel ai-memory (useCentrinoteAI_Edge.ts)

✅ **Ligne ~110-135 :** Appel toutes les 5 messages (fire & forget)
```typescript
const allMessages = [
  ...messages,
  { role: 'assistant' as const, content: data.reply }
];
const messageCount = allMessages.length;

if (messageCount > 0 && messageCount % 5 === 0) {
  // Appel fire & forget à ai-memory
}
```

### 3. Session ID stable

✅ **Ligne ~50-63 :** Session ID stocké dans localStorage
```typescript
const STORAGE_KEY = `ai_session_${session.user.id}`;
let sessionId = localStorage.getItem(STORAGE_KEY);
```

### 4. Upsert dans ai-memory

✅ **Ligne ~130-145 :** Upsert avec gestion des conflits
```typescript
.upsert(
  { ... },
  {
    onConflict: "user_id,session_id",
    ignoreDuplicates: false // Mettre à jour si existe
  }
)
```

### 5. Index SQL

✅ **Fichier :** `supabase/migrations/20251201_chat_memory_index.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_updated 
ON chat_memory(user_id, updated_at DESC);
```

## 🐛 Dépannage

### Problème : La mémoire n'est pas chargée

**Vérifier :**
1. La migration SQL a été exécutée
2. L'index existe : `SELECT * FROM pg_indexes WHERE tablename = 'chat_memory';`
3. Les logs dans la console : `🧠 Mémoire chargée (dernière session): ...`

### Problème : ai-memory n'est pas appelé

**Vérifier :**
1. Le compteur de messages : `messageCount % 5 === 0`
2. Les logs : `🧠 [useCentrinoteAI_Edge] Mémoire mise à jour (fire & forget)`
3. La console réseau : requête POST vers `/functions/v1/ai-memory`

### Problème : L'IA ne se souvient pas

**Vérifier :**
1. La mémoire existe dans `chat_memory`
2. Le placeholder `{memory}` est injecté dans le prompt
3. Les logs montrent : `🧠 Mémoire chargée (dernière session): ...`

## ✅ Checklist finale

- [ ] Migration SQL exécutée
- [ ] Index créé
- [ ] Edge Function `ai-memory` déployée
- [ ] Edge Function `ai-chat` mise à jour
- [ ] Test 1 : Mémoire entre sessions OK
- [ ] Test 2 : Chargement mémoire OK
- [ ] Test 3 : Appel toutes les 5 messages OK

---

**Date :** 2025-01-02  
**Version :** 1.0.0

