# 🧪 Guide: Tester l'Indexation du Vocabulaire

## 🎯 Objectif

Vérifier que l'Edge Function `index-vocabulary` est bien appelée et fonctionne.

## 📋 Méthodes de Test

### Méthode 1 : Test via le Frontend (Recommandé)

1. **Ouvrez la console du navigateur** (F12)
2. **Ajoutez un nouveau vocabulaire** dans l'interface
3. **Regardez les logs** dans la console

**Logs attendus** :
```
✅ [VocabularyService] Mot converti et retourné: {...}
🚀 [VocabularyService] Préparation indexation vocabulaire...
🔄 [VocabularyService] setTimeout exécuté - Appel indexVocabulary...
📦 [VocabularyService] Import du service vocabularyIndexService...
✅ [VocabularyService] Service importé, appel indexVocabulary...
🚀 [vocabularyIndexService] ===== DÉBUT INDEXATION VOCABULAIRE =====
📞 [vocabularyIndexService] Appel Edge Function index-vocabulary...
📥 [vocabularyIndexService] Réponse Edge Function reçue: {...}
```

### Méthode 2 : Test via SQL (Direct)

1. **Exécutez le script** `TEST_APPEL_INDEX_VOCABULARY.sql`
2. **Remplacez** :
   - `VOTRE_USER_ID` par votre user_id
   - `VOCABULARY_ID` par un ID de vocabulaire réel
   - `YOUR_PROJECT_REF` par votre référence Supabase
3. **Vérifiez les logs** dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs

### Méthode 3 : Test via Supabase Dashboard

1. Allez dans **Supabase Dashboard** > **Edge Functions** > `index-vocabulary`
2. Cliquez sur **Invoke**
3. Entrez le payload :
   ```json
   {
     "vocabulary_id": "VOTRE_VOCABULARY_ID",
     "user_id": "VOTRE_USER_ID"
   }
   ```
4. Cliquez sur **Invoke**
5. Vérifiez la réponse et les logs

## 🔍 Vérifications

### 1. Vérifier que l'Edge Function est déployée

```sql
-- Dans Supabase Dashboard > SQL Editor
SELECT 
  name,
  CASE 
    WHEN name = 'index-vocabulary' THEN '✅ Déployée'
    ELSE '❌ Non trouvée'
  END AS status
FROM pg_proc
WHERE proname LIKE '%index%vocabulary%';
```

**Note** : Cette requête ne fonctionne pas pour les Edge Functions. Vérifiez plutôt dans le Dashboard.

### 2. Vérifier que les chunks sont créés

```sql
-- Remplacez VOTRE_USER_ID par votre user_id
SELECT 
  v.id,
  v.word,
  v.definition,
  c.id AS chunk_id,
  c.chunk_text,
  c.created_at,
  CASE 
    WHEN c.id IS NULL THEN '❌ Non indexé'
    ELSE '✅ Indexé'
  END AS status
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'VOTRE_USER_ID'
ORDER BY v.updated_at DESC
LIMIT 10;
```

### 3. Vérifier les logs de l'Edge Function

1. Allez dans **Supabase Dashboard** > **Edge Functions** > `index-vocabulary`
2. Cliquez sur **Logs**
3. Cherchez les logs récents (dernières 5 minutes)
4. Vous devriez voir :
   ```
   === index-vocabulary appelé ===
   === Indexation de vocabulaire démarrée ===
   Chunk vocabulaire indexé avec succès
   ```

## 🐛 Diagnostic

### Problème : Pas de logs dans la console

**Causes possibles** :
- Le `setTimeout` ne s'exécute pas
- L'import dynamique échoue
- Erreur JavaScript silencieuse

**Solution** :
1. Vérifiez qu'il n'y a pas d'erreur JavaScript dans la console
2. Vérifiez que `vocabularyIndexService.ts` existe
3. Testez avec la méthode SQL (directe)

### Problème : Pas de logs dans Supabase

**Causes possibles** :
- L'Edge Function n'est pas déployée
- L'appel échoue avant d'arriver à l'Edge Function
- Problème de CORS ou d'authentification

**Solution** :
1. Vérifiez que l'Edge Function est déployée
2. Testez avec la méthode Dashboard (Invoke)
3. Vérifiez les variables d'environnement (OPENAI_API_KEY)

### Problème : Les chunks ne sont pas créés

**Causes possibles** :
- Erreur lors de l'insertion dans la base de données
- Permissions RLS bloquent l'insertion
- Format de l'embedding incorrect

**Solution** :
1. Vérifiez les logs de l'Edge Function pour voir l'erreur exacte
2. Vérifiez que la table `vocabulary_chunks_embeddings` existe
3. Vérifiez les permissions RLS

## ✅ Checklist de Test

- [ ] Logs visibles dans la console du navigateur
- [ ] Logs visibles dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs
- [ ] Chunks créés dans `vocabulary_chunks_embeddings` (vérification SQL)
- [ ] L'IA répond correctement à "Quel est mon dernier vocabulaire ?"

## 📝 Scripts SQL Fournis

1. **`TEST_APPEL_INDEX_VOCABULARY.sql`** : Test manuel de l'Edge Function
2. **`CONFIGURER_TRIGGER_INDEX_VOCABULARY.sql`** : Configuration du trigger SQL
3. **`DIAGNOSTIC_INDEXATION_VOCABULARY.sql`** : Diagnostic complet

