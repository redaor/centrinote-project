# 🧪 Test: Indexation du Vocabulaire

## 🔍 Diagnostic Étape par Étape

### Étape 1 : Vérifier que l'Edge Function est déployée

1. Allez dans **Supabase Dashboard** > **Edge Functions**
2. Vérifiez que `index-vocabulary` existe dans la liste
3. Si elle n'existe pas :
   - Cliquez sur **Create a new function**
   - Nom : `index-vocabulary`
   - Copiez le code depuis `supabase/functions/index-vocabulary/index.ts`
   - Cliquez sur **Deploy**

### Étape 2 : Vérifier les variables d'environnement

Dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets** :

- ✅ `OPENAI_API_KEY` doit être configurée
- ✅ `SUPABASE_URL` est automatique
- ✅ `SUPABASE_SERVICE_ROLE_KEY` est automatique

### Étape 3 : Tester l'indexation manuellement

1. **Ouvrez la console du navigateur** (F12)
2. **Ajoutez un nouveau mot de vocabulaire** dans l'interface
3. **Vérifiez les logs dans la console** :
   - Vous devriez voir : `🚀 [vocabularyIndexService] Début indexation vocabulaire`
   - Puis : `📞 [vocabularyIndexService] Appel Edge Function index-vocabulary...`
   - Puis : `📥 [vocabularyIndexService] Réponse Edge Function:`

### Étape 4 : Vérifier les logs de l'Edge Function

1. Allez dans **Supabase Dashboard** > **Edge Functions** > `index-vocabulary`
2. Cliquez sur **Logs**
3. Vous devriez voir :
   - `=== index-vocabulary appelé ===`
   - `=== Indexation de vocabulaire démarrée ===`
   - `Chunk vocabulaire indexé avec succès`

### Étape 5 : Vérifier les chunks dans la base de données

Exécutez cette requête SQL dans **Supabase Dashboard** > **SQL Editor** :

```sql
-- Remplacez VOTRE_USER_ID par votre vrai user_id
SELECT 
  v.id,
  v.word,
  v.definition,
  v.updated_at,
  c.id AS chunk_id,
  c.chunk_text,
  c.created_at AS chunk_created_at,
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

### Étape 6 : Tester avec l'IA

1. Ajoutez un nouveau mot de vocabulaire (ex: "test-indexation")
2. Attendez 3-5 secondes
3. Posez une question à l'IA : **"Quel est mon dernier vocabulaire ?"**
4. L'IA devrait répondre avec le mot que vous venez d'ajouter

## 🐛 Problèmes Courants

### Problème 1 : Pas de logs dans la console

**Cause** : L'appel à `indexVocabulary` n'est pas fait

**Solution** :
1. Vérifiez que `vocabularyService.ts` importe bien `indexVocabulary`
2. Vérifiez que l'appel est bien fait après `addVocabularyEntry` et `updateVocabularyEntry`
3. Vérifiez qu'il n'y a pas d'erreur JavaScript qui bloque l'exécution

### Problème 2 : Erreur "Function not found"

**Cause** : L'Edge Function `index-vocabulary` n'est pas déployée

**Solution** :
1. Déployez l'Edge Function depuis le Dashboard Supabase
2. Vérifiez que le nom est exactement `index-vocabulary` (avec tiret)

### Problème 3 : Erreur "OPENAI_API_KEY manquante"

**Cause** : La clé API OpenAI n'est pas configurée dans les secrets Supabase

**Solution** :
1. Allez dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets**
2. Ajoutez `OPENAI_API_KEY` avec votre clé API OpenAI

### Problème 4 : Les chunks ne sont pas créés

**Cause** : L'Edge Function échoue silencieusement

**Solution** :
1. Vérifiez les logs de l'Edge Function dans Supabase Dashboard
2. Vérifiez que la table `vocabulary_chunks_embeddings` existe
3. Vérifiez que l'utilisateur a les permissions nécessaires

### Problème 5 : L'IA ne trouve pas le vocabulaire

**Cause** : Les chunks existent mais ne sont pas trouvés par la recherche sémantique

**Solution** :
1. Vérifiez que `chat-memory` est bien redéployée avec les modifications
2. Vérifiez que `getLastVocabulary` est bien appelée dans `chat-memory`
3. Testez avec une question directe : "Quel est mon dernier vocabulaire ?"

## ✅ Checklist de Vérification

- [ ] Edge Function `index-vocabulary` déployée
- [ ] Variable `OPENAI_API_KEY` configurée dans Supabase
- [ ] Logs visibles dans la console du navigateur lors de l'ajout d'un vocabulaire
- [ ] Logs visibles dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs
- [ ] Chunks créés dans `vocabulary_chunks_embeddings` (vérification SQL)
- [ ] L'IA répond correctement à "Quel est mon dernier vocabulaire ?"

## 📝 Notes

- Les logs sont maintenant plus détaillés pour faciliter le diagnostic
- L'indexation se fait en arrière-plan et ne bloque pas l'opération principale
- Si l'indexation échoue, elle sera réessayée au prochain ajout/mise à jour

