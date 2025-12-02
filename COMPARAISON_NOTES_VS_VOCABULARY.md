# 🔍 Comparaison Notes vs Vocabulaire

## ✅ Ce qui fonctionne pour les Notes

### 1. **Import Dynamique avec setTimeout**
```typescript
// notesService.ts
setTimeout(async () => {
  try {
    const { indexNote } = await import('../services/noteIndexService');
    await indexNote(newNote.id, note.userId);
  } catch (err) {
    logger.warn('⚠️ Erreur indexation note (non bloquant):', err);
  }
}, 0);
```

### 2. **Format Embedding (String)**
```typescript
// index-note/index.ts
embedding: `[${chunk.embedding.join(",")}]`, // Format string pour pgvector
```

### 3. **Logger Partagé**
```typescript
// index-note/index.ts
import { logger } from "../_shared/logger.ts";
```

## ❌ Ce qui ne fonctionne pas pour le Vocabulaire

### 1. **Import Statique Direct** (CORRIGÉ)
```typescript
// ❌ AVANT (ne fonctionnait pas)
import { indexVocabulary } from './vocabularyIndexService';
indexVocabulary(newEntry.id, entry.userId).catch(...);

// ✅ APRÈS (identique aux notes)
setTimeout(async () => {
  try {
    const { indexVocabulary } = await import('./vocabularyIndexService');
    await indexVocabulary(newEntry.id, entry.userId);
  } catch (err) {
    logger.warn('⚠️ Erreur indexation vocabulaire (non bloquant):', err);
  }
}, 0);
```

### 2. **Format Embedding** (CORRIGÉ)
```typescript
// ✅ Maintenant identique aux notes
embedding: `[${embedding.join(",")}]`, // Format string pour pgvector
```

## 🔧 Corrections Appliquées

1. ✅ **Import dynamique** : Utilisation de `setTimeout` + `import()` comme pour les notes
2. ✅ **Format embedding** : Utilisation du format string comme pour les notes
3. ✅ **Gestion d'erreur** : Identique aux notes

## 🧪 Test

Maintenant, testez :
1. Ajoutez un nouveau vocabulaire
2. Vérifiez les logs dans la console : `🔄 [VocabularyService] Appel indexVocabulary...`
3. Vérifiez les logs dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs
4. Testez avec l'IA : "Quel est mon dernier vocabulaire ?"

