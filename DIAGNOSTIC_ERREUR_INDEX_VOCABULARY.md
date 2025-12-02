# 🔍 Diagnostic: Erreur index-vocabulary

## 📋 Informations Nécessaires

Pour diagnostiquer l'erreur, j'ai besoin de :

1. **Le message d'erreur exact** (copier-coller complet)
2. **Où l'erreur apparaît** :
   - Dans la console du navigateur ?
   - Dans Supabase Dashboard > Edge Functions > Logs ?
   - Dans l'IDE (TypeScript) ?
3. **Quand l'erreur apparaît** :
   - Lors de la création du vocabulaire ?
   - Lors de l'appel à l'Edge Function ?

## 🔧 Vérifications Immédiates

### 1. Vérifier les Logs dans la Console du Navigateur

Ouvrez la console (F12) et cherchez :
- `🚀 [vocabularyIndexService] Début indexation vocabulaire`
- `📞 [vocabularyIndexService] Appel Edge Function index-vocabulary...`
- `❌` ou `ERROR` en rouge

**Copiez-collez tous les messages d'erreur que vous voyez.**

### 2. Vérifier les Logs dans Supabase

1. Allez dans **Supabase Dashboard** > **Edge Functions** > `index-vocabulary`
2. Cliquez sur **Logs**
3. Cherchez les logs récents (dernières 5 minutes)
4. **Copiez-collez les logs d'erreur**

### 3. Vérifier que l'Edge Function est Déployée

1. Allez dans **Supabase Dashboard** > **Edge Functions**
2. Vérifiez que `index-vocabulary` apparaît dans la liste
3. Si elle n'existe pas, **déployez-la** :
   - Cliquez sur **Create a new function**
   - Nom : `index-vocabulary`
   - Copiez le code depuis `supabase/functions/index-vocabulary/index.ts`
   - Cliquez sur **Deploy**

### 4. Vérifier les Variables d'Environnement

Dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets** :

- ✅ `OPENAI_API_KEY` doit être configurée
- ✅ `SUPABASE_URL` est automatique
- ✅ `SUPABASE_SERVICE_ROLE_KEY` est automatique

## 🐛 Erreurs Courantes

### Erreur TypeScript dans l'IDE

Si vous voyez des erreurs comme :
```
Cannot find module 'https://deno.land/std@0.200.0/http/server.ts'
Cannot find name 'Deno'
```

**C'est normal !** Ce sont des erreurs de linter TypeScript qui ne reconnaît pas les imports Deno. Ces erreurs n'empêchent pas l'Edge Function de fonctionner.

**Solution** : Ignorez ces erreurs, elles n'affectent pas l'exécution.

### Erreur "Function not found"

**Message** : `Function index-vocabulary not found`

**Cause** : L'Edge Function n'est pas déployée

**Solution** : Déployez l'Edge Function depuis le Dashboard Supabase

### Erreur "OPENAI_API_KEY manquante"

**Message** : `OPENAI_API_KEY manquante`

**Cause** : La clé API OpenAI n'est pas configurée dans les secrets Supabase

**Solution** :
1. Allez dans **Supabase Dashboard** > **Project Settings** > **Edge Functions** > **Secrets**
2. Ajoutez `OPENAI_API_KEY` avec votre clé API OpenAI

### Erreur "vocabulary_id et user_id sont requis"

**Message** : `vocabulary_id et user_id sont requis`

**Cause** : Les paramètres ne sont pas passés correctement

**Solution** : Vérifiez les logs dans la console du navigateur pour voir ce qui est envoyé

### Erreur "Vocabulaire non trouvé ou accès refusé"

**Message** : `Vocabulaire non trouvé ou accès refusé`

**Cause** : Le vocabulaire n'existe pas ou l'utilisateur n'a pas les permissions

**Solution** : Vérifiez que le vocabulaire existe et que l'utilisateur est le propriétaire

### Erreur d'Insertion dans la Base de Données

**Message** : `Erreur insertion chunk: ...`

**Causes possibles** :
1. La table `vocabulary_chunks_embeddings` n'existe pas
2. Les permissions RLS bloquent l'insertion
3. Le format de l'embedding est incorrect

**Solution** :
1. Vérifiez que la migration `20251202_create_vocabulary_chunks_embeddings.sql` a été exécutée
2. Vérifiez les permissions RLS sur la table

## 📝 Test Rapide

Exécutez cette requête SQL pour vérifier que tout est en place :

```sql
-- 1. Vérifier que la table existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'vocabulary_chunks_embeddings'
) AS table_exists;

-- 2. Vérifier que le trigger existe
SELECT EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'trigger_auto_index_vocabulary'
) AS trigger_exists;

-- 3. Vérifier que pg_net est activé
SELECT EXISTS (
  SELECT 1 FROM pg_extension 
  WHERE extname = 'pg_net'
) AS pg_net_enabled;
```

## 🆘 Besoin d'Aide ?

**Envoyez-moi** :
1. Le message d'erreur exact (copier-coller)
2. Les logs de la console du navigateur
3. Les logs de Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs
4. Le résultat des requêtes SQL de test ci-dessus

Cela m'aidera à identifier précisément le problème !

