# 🔍 Diagnostic: Mémorisation Vocabulaire vs Notes

## 📊 Comparaison Système par Système

### ✅ SYSTÈME NOTES (Fonctionne)

#### 1. **Stockage des données**
- **Table**: `note_chunks_embeddings`
- **Structure**: 
  - `note_id`, `user_id`, `chunk_index`, `chunk_text`, `embedding` (VECTOR(1536))
- **Indexation**: 
  - Edge Function `index-note` appelée automatiquement via trigger SQL
  - Chunking: découpe les notes en chunks de ~400 tokens avec overlap de 50 tokens
  - Format embedding: `[${embedding.join(",")}]` (string formatée)

#### 2. **Récupération des données**
- **Fonction SQL**: `search_note_chunks(p_user_id, p_query_embedding, p_limit, p_similarity_threshold)`
- **Similarité minimum**: `MIN_NOTE_SIMILARITY = 0.5` (réduit de 0.7)
- **Limite**: `MAX_NOTE_CHUNKS = 8`
- **Retour**: Chunks avec `note_title`, `note_tags`, `note_updated_at` inclus

#### 3. **Injection dans le prompt**
- **Position**: Avant la mémoire de conversation (priorité haute)
- **Format**: 
  ```
  📝 Note: "{note_title}" [Tags: ...]
  Extrait 1 (pertinence: X%):
  {chunk_text}
  ```
- **Section**: `NOTES CENTRINOTE PERTINENTES (base de connaissances de l'utilisateur)`
- **Instructions**: "⚠️ IMPORTANT: Utilise ces notes comme source principale pour répondre"

---

### ❌ SYSTÈME VOCABULARY (Ne fonctionne pas)

#### 1. **Stockage des données**
- **Table**: `vocabulary_chunks_embeddings`
- **Structure**: 
  - `vocabulary_id`, `user_id`, `chunk_text`, `embedding` (VECTOR(1536))
- **Indexation**: 
  - Edge Function `index-vocabulary` appelée via trigger SQL (ou fallback frontend)
  - **Pas de chunking**: Une seule entrée par vocabulaire (pas de découpe)
  - Format embedding: `[${embedding.join(",")}]` (string formatée) ✅ **CORRIGÉ**

#### 2. **Récupération des données**
- **Fonction SQL**: `search_vocabulary_chunks(p_user_id, p_query_embedding, p_limit, p_similarity_threshold)`
- **Similarité minimum**: `MIN_VOCABULARY_SIMILARITY = 0.5`
- **Limite**: `MAX_VOCABULARY_CHUNKS = 5`
- **Retour**: Chunks avec `word`, `definition`, `category`, `examples`, etc. inclus

#### 3. **Injection dans le prompt**
- **Position**: Après les notes, avant la mémoire de conversation
- **Format**: 
  ```
  📚 Vocabulaire 1 (pertinence: X%):
  Mot: {word}
  Définition: {definition}
  Exemples: {examples}
  Catégorie: {category}
  ```
- **Section**: `VOCABULAIRE CENTRINOTE PERTINENT (dictionnaire personnel de l'utilisateur)`
- **Instructions**: "⚠️ IMPORTANT: Utilise ce vocabulaire pour répondre aux questions sur les définitions..."

---

## 🔍 DIFFÉRENCES CLÉS IDENTIFIÉES

### 1. **Format du texte indexé** ⚠️ **PROBLÈME POTENTIEL**

**Notes**:
- Le texte indexé est le **contenu brut** de la note (title + content)
- Format: `"${note.title}\n\n${note.content}"`
- Chunking intelligent avec overlap pour préserver le contexte

**Vocabulaire**:
- Le texte indexé est **formaté** via `formatVocabularyText()`:
  ```typescript
  const text = `${word}\n\nDéfinition: ${definition}\n\nCatégorie: ${category}\n\nExemples: ${examples.join(", ")}`;
  ```
- **Problème potentiel**: Le formatage peut créer un embedding différent de ce que l'utilisateur demande

### 2. **Similarité sémantique** ⚠️ **PROBLÈME POTENTIEL**

**Notes**:
- Recherche sur le **contenu** de la note
- Si l'utilisateur demande "ma note sur X", l'embedding de la question correspond au contenu

**Vocabulaire**:
- Recherche sur le **texte formaté** (word + definition + examples)
- Si l'utilisateur demande "mon vocabulaire X" ou "qu'est-ce que X", l'embedding peut ne pas correspondre au formatage

### 3. **Logs et debugging** ⚠️ **MANQUE DE VISIBILITÉ**

**Notes**:
- Logs détaillés dans `retrieveRelevantNoteChunks`:
  - `chunk_text_preview` pour voir le contenu
  - `notesTextPreview` pour voir ce qui est injecté

**Vocabulaire**:
- Logs moins détaillés dans `retrieveRelevantVocabularyChunks`
- Pas de preview du texte formaté qui sera injecté

---

## 🎯 HYPOTHÈSES DE PROBLÈME

### Hypothèse 1: **Format du texte indexé** (Probabilité: 70%)

Le vocabulaire est indexé avec un format spécifique:
```
word

Définition: definition

Catégorie: category

Exemples: example1, example2
```

Mais l'utilisateur peut demander:
- "mon dernier vocabulaire"
- "le mot X"
- "qu'est-ce que X"

L'embedding de la question peut ne pas correspondre au formatage.

**Solution**: Indexer aussi le mot seul, ou améliorer le formatage pour inclure des variantes.

### Hypothèse 2: **Similarité trop élevée** (Probabilité: 20%)

Même avec `MIN_VOCABULARY_SIMILARITY = 0.5`, les résultats peuvent être vides si:
- Le formatage crée un embedding trop différent
- La question de l'utilisateur est trop vague

**Solution**: Réduire encore le seuil ou améliorer le matching.

### Hypothèse 3: **Indexation non déclenchée** (Probabilité: 10%)

Le trigger SQL ou le fallback frontend peut ne pas fonctionner.

**Solution**: Vérifier que les chunks sont bien créés dans la base.

---

## 🔧 QUESTIONS CIBLÉES POUR DIAGNOSTIC

1. **Vérification des données indexées**:
   ```sql
   -- Combien de chunks de vocabulaire existent pour votre user_id?
   SELECT COUNT(*) FROM vocabulary_chunks_embeddings WHERE user_id = 'VOTRE_USER_ID';
   
   -- Quel est le contenu d'un chunk?
   SELECT chunk_text, word, definition 
   FROM vocabulary_chunks_embeddings c
   JOIN vocabulary v ON v.id = c.vocabulary_id
   WHERE c.user_id = 'VOTRE_USER_ID'
   LIMIT 5;
   ```

2. **Test de recherche sémantique**:
   ```sql
   -- Testez la recherche avec un embedding de test
   -- (Besoin d'un embedding généré pour "mon dernier vocabulaire")
   ```

3. **Logs de l'Edge Function**:
   - Vérifiez les logs de `chat-memory` pour voir:
     - `resultCount` pour vocabulary chunks
     - Les erreurs éventuelles dans `retrieveRelevantVocabularyChunks`

---

## 🛠️ SOLUTION PROPOSÉE (Simple, sans refactor)

### Option 1: **Améliorer le formatage du texte indexé** (Recommandé)

Modifier `formatVocabularyText()` dans `index-vocabulary/index.ts` pour inclure des variantes:

```typescript
function formatVocabularyText(vocab: VocabularyData): string {
  // Format principal
  const main = `${vocab.word}\n\nDéfinition: ${vocab.definition}`;
  
  // Ajouter des variantes pour améliorer le matching
  const variants = [
    `Mot: ${vocab.word}`,
    `Le mot ${vocab.word}`,
    `${vocab.word} signifie ${vocab.definition}`,
  ];
  
  if (vocab.category) {
    variants.push(`Catégorie: ${vocab.category}`);
  }
  
  if (vocab.examples && vocab.examples.length > 0) {
    variants.push(`Exemples: ${vocab.examples.join(", ")}`);
  }
  
  return [main, ...variants].join("\n\n");
}
```

### Option 2: **Réduire le seuil de similarité** (Temporaire)

Réduire `MIN_VOCABULARY_SIMILARITY` de `0.5` à `0.3` pour être plus permissif.

### Option 3: **Ajouter des logs détaillés** (Pour diagnostic)

Ajouter dans `retrieveRelevantVocabularyChunks`:
```typescript
logger.info(`Résultat recherche chunks de vocabulaire`, {
  resultCount: data?.length || 0,
  results: data?.slice(0, 3).map((r: any) => ({
    vocabulary_id: r.vocabulary_id?.substring(0, 8) + "...",
    word: r.word,
    similarity: r.similarity,
    chunk_text_preview: r.chunk_text?.substring(0, 100) + "..." // ⭐ AJOUTER
  })) || []
});
```

---

## 📋 CHECKLIST DE DIAGNOSTIC

- [ ] Vérifier que les chunks de vocabulaire existent dans la base
- [ ] Vérifier le format du `chunk_text` stocké
- [ ] Tester la fonction SQL `search_vocabulary_chunks` directement
- [ ] Vérifier les logs de `chat-memory` pour voir si des chunks sont retournés
- [ ] Comparer un embedding de question avec un embedding de vocabulaire
- [ ] Vérifier que le trigger SQL `index-vocabulary` est bien appelé

---

## 🎯 PROCHAINE ÉTAPE RECOMMANDÉE

1. **Exécutez les requêtes SQL** ci-dessus pour vérifier les données
2. **Vérifiez les logs** de `chat-memory` lors d'une question sur le vocabulaire
3. **Partagez-moi**:
   - Le nombre de chunks de vocabulaire dans la base
   - Un exemple de `chunk_text` stocké
   - Les logs de `chat-memory` lors d'une question sur le vocabulaire

Ensuite, je pourrai vous donner une solution précise et ciblée.

