# 🔧 Fix: Indexation du Vocabulaire

## 🚨 Problèmes Identifiés

1. **Pas de logs sur `index-vocabulary`** : Le trigger SQL ne fonctionne probablement pas
2. **L'IA ne se rappelle pas du dernier vocabulaire** : Les chunks ne sont pas créés

## ✅ Solutions Appliquées

### 1. Service d'Indexation Frontend (Fallback)

**Fichier créé** : `src/services/vocabularyIndexService.ts`

Ce service appelle directement l'Edge Function `index-vocabulary` depuis le frontend, comme fallback si le trigger SQL ne fonctionne pas.

### 2. Intégration dans `vocabularyService`

**Fichier modifié** : `src/services/vocabularyService.ts`

- ✅ Appel à `indexVocabulary()` après `addVocabularyEntry()`
- ✅ Appel à `indexVocabulary()` après `updateVocabularyEntry()`
- ✅ Non bloquant (en arrière-plan, ne bloque pas l'opération principale)

### 3. Script de Diagnostic

**Fichier créé** : `DIAGNOSTIC_INDEXATION_VOCABULARY.sql`

Script SQL pour diagnostiquer les problèmes :
- Vérifier que la table existe
- Vérifier que le trigger existe
- Vérifier que `pg_net` est activé
- Lister les vocabulaires non indexés
- Vérifier les settings Supabase

## 🔍 Diagnostic

### Étape 1 : Vérifier que l'Edge Function est déployée

1. Allez dans **Supabase Dashboard** > **Edge Functions**
2. Vérifiez que `index-vocabulary` existe
3. Si elle n'existe pas, déployez-la :
   - Copiez le code depuis `supabase/functions/index-vocabulary/index.ts`
   - Créez la fonction dans le Dashboard

### Étape 2 : Exécuter le script de diagnostic

1. Allez dans **Supabase Dashboard** > **SQL Editor**
2. Ouvrez `DIAGNOSTIC_INDEXATION_VOCABULARY.sql`
3. Remplacez `'VOTRE_USER_ID'` par votre vrai `user_id`
4. Exécutez les requêtes une par une

### Étape 3 : Vérifier le trigger SQL

Le trigger peut ne pas fonctionner si :
- `pg_net` n'est pas activé
- L'URL Supabase n'est pas configurée dans `app.settings.supabase_url`
- La service key n'est pas configurée

**Solution temporaire** : Le fallback frontend devrait fonctionner même si le trigger ne fonctionne pas.

## 🧪 Test

### Test 1 : Ajouter un nouveau vocabulaire

1. Ajoutez un nouveau mot de vocabulaire dans l'interface
2. Ouvrez la console du navigateur (F12)
3. Vérifiez qu'il y a un log : `"Indexation du vocabulaire"`
4. Vérifiez dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs qu'il y a un appel

### Test 2 : Vérifier les chunks créés

```sql
-- Vérifier qu'un chunk existe pour votre vocabulaire
SELECT 
  v.word,
  v.definition,
  c.chunk_text,
  c.created_at
FROM vocabulary v
LEFT JOIN vocabulary_chunks_embeddings c ON c.vocabulary_id = v.id
WHERE v."userId" = 'VOTRE_USER_ID'
ORDER BY v.updated_at DESC
LIMIT 5;
```

### Test 3 : Tester avec l'IA

1. Ajoutez un nouveau mot de vocabulaire
2. Attendez quelques secondes (indexation)
3. Posez une question à l'IA : "Quel est mon dernier vocabulaire ?"
4. L'IA devrait mentionner le mot que vous venez d'ajouter

## 🔧 Fix du Trigger SQL (Optionnel)

Si vous voulez que le trigger fonctionne automatiquement :

### 1. Configurer l'URL Supabase

```sql
-- Dans Supabase Dashboard > SQL Editor
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://VOTRE_PROJECT_REF.supabase.co';
```

### 2. Configurer la Service Key (Optionnel)

```sql
-- Dans Supabase Dashboard > SQL Editor
ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';
```

**⚠️ Attention** : Ne stockez jamais la service key dans le code source. Utilisez les secrets Supabase.

### 3. Vérifier que le trigger est actif

```sql
SELECT 
  tgname,
  tgenabled,
  tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'trigger_auto_index_vocabulary';
```

## 📝 Notes

- Le fallback frontend fonctionne même si le trigger SQL ne fonctionne pas
- L'indexation se fait en arrière-plan et ne bloque pas l'opération principale
- Si l'indexation échoue, elle sera réessayée au prochain ajout/mise à jour
- Les logs sont disponibles dans la console du navigateur et dans Supabase Dashboard

## ✅ Checklist

- [ ] Edge Function `index-vocabulary` déployée
- [ ] Service `vocabularyIndexService.ts` créé
- [ ] Intégration dans `vocabularyService.ts` faite
- [ ] Test d'ajout de vocabulaire réussi
- [ ] Vérification des chunks créés dans la base de données
- [ ] Test avec l'IA réussi
- [ ] (Optionnel) Trigger SQL configuré et fonctionnel

