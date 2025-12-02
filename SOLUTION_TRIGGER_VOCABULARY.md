# 🔧 Solution: Configuration du Trigger index-vocabulary

## ❌ Problème

L'erreur `permission denied to set parameter "app.settings.supabase_url"` se produit car `ALTER DATABASE` nécessite des privilèges super-utilisateur que vous n'avez pas dans Supabase.

## ✅ Solution

Au lieu de configurer les settings (qui nécessitent des privilèges), nous allons **mettre à jour le trigger pour utiliser l'URL Supabase directement** (en dur dans le code).

## 📋 Étapes

### 1. Exécuter le script de correction

Exécutez `FIX_TRIGGER_VOCABULARY_URL.sql` dans Supabase Dashboard > SQL Editor.

Ce script :
- ✅ Met à jour la fonction `trigger_index_vocabulary()` avec l'URL Supabase en dur
- ✅ N'a plus besoin de settings configurés
- ✅ Fonctionne immédiatement

### 2. Tester le trigger

Exécutez `TEST_TRIGGER_VOCABULARY_DIRECT.sql` pour vérifier que le trigger fonctionne.

### 3. (Optionnel) Configurer la Service Key

Si vous voulez utiliser la service key (plus sécurisé), vous pouvez la configurer via :

```sql
ALTER ROLE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';
```

**Note** : Ce n'est pas obligatoire. Si la service key n'est pas configurée, le trigger utilisera l'anon key, ou le fallback frontend (`vocabularyService.ts`) s'en chargera.

## 🔍 Vérification

Après avoir exécuté `FIX_TRIGGER_VOCABULARY_URL.sql`, vérifiez :

1. **Le trigger est actif** :
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgname = 'trigger_auto_index_vocabulary';
   ```

2. **Testez en créant un vocabulaire** :
   - Créez un vocabulaire dans l'interface
   - Attendez 2-3 secondes
   - Vérifiez les logs dans Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs

3. **Vérifiez les requêtes HTTP** :
   ```sql
   SELECT id, url, method, created_at, error_msg
   FROM net.http_request_queue
   WHERE url LIKE '%index-vocabulary%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## 🎯 Résultat Attendu

Après cette correction :
- ✅ Le trigger fonctionne sans configuration de settings
- ✅ L'URL Supabase est directement dans le code
- ✅ Le trigger appelle automatiquement `index-vocabulary` à chaque création/mise à jour de vocabulaire
- ✅ Le fallback frontend (`vocabularyService.ts`) continue de fonctionner si le trigger échoue

## 📝 Note Importante

L'URL Supabase est maintenant **en dur** dans le code du trigger. Si vous changez de projet Supabase, vous devrez :
1. Mettre à jour l'URL dans `FIX_TRIGGER_VOCABULARY_URL.sql`
2. Réexécuter le script

