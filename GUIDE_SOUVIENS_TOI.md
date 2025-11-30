# 🧠 Guide : Fonctionnalité "Souviens-toi" comme ChatGPT

## 📋 Vue d'ensemble

La fonctionnalité "souviens-toi" permet à l'utilisateur de demander explicitement à l'IA de mémoriser une information. L'IA peut ensuite répondre à la question "Que sais-tu sur moi ?" en se basant uniquement sur ces informations mémorisées.

## 🎯 Fonctionnalités

### 1. Détection des commandes "souviens-toi"

L'IA détecte automatiquement les commandes suivantes :
- "souviens-toi que..."
- "note que..."
- "retiens que..."
- "mémorise que..."
- "rappelle-toi que..."

**Exemples :**
- "Souviens-toi que mon fruit préféré est la mangue"
- "Note que je travaille chez CentriNote"
- "Retiens que j'aime le café le matin"

### 2. Traitement de la commande

Quand une commande "souviens-toi" est détectée :

1. **Nettoyage** : Les mots-clés sont retirés pour extraire l'information pure
   - "Souviens-toi que mon fruit préféré est la mangue" → "mon fruit préféré est la mangue"

2. **Sauvegarde** : L'information est sauvegardée dans `chat_memory` avec :
   - `summary` = texte brut de l'information
   - `key_topics` = `["user_preference"]`
   - `is_command` = `true`

3. **Réponse immédiate** : L'IA répond "✅ J'ai enregistré cette information." sans appeler GPT

4. **Toast** : Un toast "Information mémorisée ✅" s'affiche dans l'interface

### 3. Question "Que sais-tu sur moi ?"

Quand l'utilisateur demande "Que sais-tu sur moi ?", l'IA :

1. **Charge la mémoire** : Récupère la dernière mémoire de l'utilisateur (par `user_id`)
2. **Répond uniquement avec la mémoire** : Ne cherche pas sur le web, ne mentionne pas les notes ou le vocabulaire
3. **Si pas de mémoire** : Répond "Je n'ai pas encore d'informations mémorisées sur vous."

**Variantes détectées :**
- "Que sais-tu sur moi ?"
- "Que connais-tu de moi ?"
- "Qu'est-ce que tu sais sur moi ?"
- "Raconte-moi ce que tu sais sur moi"

## 🔧 Implémentation technique

### 1. Détection dans `ai-chat/index.ts`

```typescript
const rememberPatterns = [
  /souviens-toi\s+(?:que|de|qu'|d'|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
  /note\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
  /retiens\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
  /mémorise\s+(?:que|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
  /rappelle-toi\s+(?:que|de|qu'|d'|que\s+je|que\s+mon|que\s+ma|que\s+mes)/i,
];
```

### 2. Sauvegarde dans `ai-memory/index.ts`

```typescript
if (is_command && command_text) {
  // Sauvegarder directement sans analyse GPT
  await supabase.from("chat_memory").upsert({
    user_id: user_id,
    session_id: session_id,
    summary: command_text.trim(),
    key_topics: ["user_preference"],
    language: "fr",
    mood: null,
    updated_at: new Date().toISOString()
  });
}
```

### 3. Toast dans `AIChat.tsx`

```typescript
if (edgeReply.memory_saved) {
  // Créer et afficher un toast
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  toast.innerHTML = 'Information mémorisée ✅';
  document.body.appendChild(toast);
  
  // Retirer après 3 secondes
  setTimeout(() => toast.remove(), 3000);
}
```

### 4. Section mémoire dans le prompt système

```typescript
const memoryContext = chatMemory?.summary 
  ? `\n\nMémoire utilisateur :\n{memory}\n${chatMemory.summary}...`
  : '\n\nMémoire utilisateur :\n{memory}\n';
```

### 5. Réponse uniquement avec la mémoire

```typescript
const isMemoryQuery = /^(?:que\s+sais-tu\s+sur\s+moi|...)/i.test(effectiveQuestion);

if (isMemoryQuery && chatMemory?.summary) {
  const memoryOnlyInstruction = '\n\n⚠️ IMPORTANT : Réponds UNIQUEMENT avec les informations de la mémoire utilisateur ci-dessus.';
  // Générer réponse uniquement avec la mémoire
}
```

## 📊 Structure de données

### Table `chat_memory`

```sql
CREATE TABLE chat_memory (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  summary TEXT,              -- Information mémorisée (texte brut si is_command)
  key_topics TEXT[],         -- ["user_preference"] si is_command
  language TEXT DEFAULT 'fr',
  mood TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, session_id)
);
```

### Index SQL

```sql
-- Index simple sur user_id
CREATE INDEX idx_chat_memory_user_id ON chat_memory(user_id);

-- Index composite pour charger la dernière mémoire
CREATE INDEX idx_chat_memory_user_updated ON chat_memory(user_id, updated_at DESC);
```

## 🧪 Tests

### Test 1 : Mémoriser une information

1. Envoyer : "Souviens-toi que mon fruit préféré est la mangue"
2. **Résultat attendu :**
   - Réponse : "✅ J'ai enregistré cette information."
   - Toast : "Information mémorisée ✅"
   - Pas d'appel GPT

### Test 2 : Demander ce que l'IA sait

1. Envoyer : "Que sais-tu sur moi ?"
2. **Résultat attendu :**
   - Réponse basée uniquement sur la mémoire
   - Mention de "mon fruit préféré est la mangue"
   - Pas de recherche web, pas de notes/vocabulaire

### Test 3 : Vérification dans la base de données

```sql
SELECT 
  user_id,
  session_id,
  summary,
  key_topics,
  updated_at
FROM chat_memory
WHERE user_id = 'VOTRE_USER_ID'
ORDER BY updated_at DESC
LIMIT 1;
```

**Résultat attendu :**
- `summary` = "mon fruit préféré est la mangue"
- `key_topics` = `["user_preference"]`

## 🔍 Dépannage

### Problème : La commande n'est pas détectée

**Vérifier :**
1. Le pattern regex correspond au message
2. Les logs : `🧠 Commande 'souviens-toi' détectée !`
3. Le nettoyage : `📝 Commande nettoyée: "..."`

### Problème : L'information n'est pas sauvegardée

**Vérifier :**
1. `userId` et `sessionId` sont présents
2. Les logs : `✅ Information mémorisée avec succès`
3. La base de données : requête SQL ci-dessus

### Problème : Le toast ne s'affiche pas

**Vérifier :**
1. `edgeReply.memory_saved === true`
2. Le DOM : le toast est créé dans `document.body`
3. Les styles CSS : `fixed top-4 right-4 bg-green-500`

### Problème : "Que sais-tu sur moi ?" ne fonctionne pas

**Vérifier :**
1. La mémoire existe dans `chat_memory`
2. Le pattern regex correspond : `isMemoryQuery === true`
3. Les logs : `🧠 Question sur la mémoire détectée`
4. Le prompt contient : `memoryOnlyInstruction`

## ✅ Checklist finale

- [ ] Détection des commandes "souviens-toi" fonctionne
- [ ] Nettoyage de la commande correct
- [ ] Sauvegarde dans `chat_memory` avec `is_command=true`
- [ ] Réponse immédiate "✅ J'ai enregistré cette information."
- [ ] Toast s'affiche correctement
- [ ] Détection de "Que sais-tu sur moi ?" fonctionne
- [ ] Réponse uniquement avec la mémoire (pas de web/notes/vocab)
- [ ] Index SQL créé et fonctionnel

---

**Date :** 2025-01-02  
**Version :** 1.0.0

