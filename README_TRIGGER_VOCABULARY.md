# 📚 Guide Complet: Trigger index-vocabulary

## 🎯 Objectif

Le trigger `trigger_auto_index_vocabulary` appelle automatiquement l'Edge Function `index-vocabulary` à chaque fois qu'un vocabulaire est créé ou mis à jour.

## ⚠️ Problème de Permission

Si vous avez l'erreur :
```
ERROR: 42501: permission denied to set parameter "app.settings.supabase_url"
```

**Solution** : Utilisez `FIX_TRIGGER_VOCABULARY_URL.sql` au lieu de `CONFIGURER_SETTINGS_SUPABASE.sql`.

## 📋 Scripts Disponibles

### 1. `FIX_TRIGGER_VOCABULARY_URL.sql` ⭐ **RECOMMANDÉ**
- ✅ Met à jour le trigger avec l'URL Supabase en dur
- ✅ Pas besoin de privilèges super-utilisateur
- ✅ Fonctionne immédiatement

### 2. `TEST_TRIGGER_VOCABULARY_DIRECT.sql`
- Teste le trigger en créant un vocabulaire de test
- Affiche les détails de l'appel HTTP
- Vérifie si un chunk a été créé

### 3. `VERIFIER_TRIGGER_VOCABULARY.sql`
- Vérifie que pg_net est activé
- Vérifie que le trigger existe et est actif
- Liste les requêtes HTTP récentes
- Compte les appels dans les dernières 24h

### 4. `CONFIGURER_SETTINGS_SUPABASE.sql`
- ⚠️ Nécessite des privilèges super-utilisateur
- Configure les settings Supabase (si vous avez les permissions)

## 🚀 Démarrage Rapide

1. **Exécutez** `FIX_TRIGGER_VOCABULARY_URL.sql`
2. **Testez** avec `TEST_TRIGGER_VOCABULARY_DIRECT.sql`
3. **Vérifiez** les logs dans Supabase Dashboard > Edge Functions > `index-vocabulary`

## 🔍 Diagnostic

### Le trigger ne fonctionne pas ?

1. **Vérifiez que pg_net est activé** :
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```

2. **Vérifiez que le trigger existe** :
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_index_vocabulary';
   ```

3. **Vérifiez les requêtes HTTP** :
   ```sql
   SELECT * FROM net.http_request_queue
   WHERE url LIKE '%index-vocabulary%'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

4. **Vérifiez les logs de l'Edge Function** :
   - Supabase Dashboard > Edge Functions > `index-vocabulary` > Logs

### Le trigger fonctionne mais les chunks ne sont pas créés ?

1. **Vérifiez les logs de l'Edge Function** pour voir l'erreur exacte
2. **Vérifiez que `OPENAI_API_KEY` est configuré** dans Supabase Secrets
3. **Vérifiez les permissions RLS** sur `vocabulary_chunks_embeddings`

## 🔄 Fallback Frontend

Même si le trigger SQL ne fonctionne pas, le **fallback frontend** dans `vocabularyService.ts` s'en charge :
- Appelle `indexVocabulary` après chaque création/mise à jour
- Utilise `setTimeout` pour ne pas bloquer l'interface
- Logs détaillés dans la console du navigateur

## 📝 Notes

- L'URL Supabase est maintenant **en dur** dans le trigger
- Si vous changez de projet, mettez à jour l'URL dans `FIX_TRIGGER_VOCABULARY_URL.sql`
- La service key est optionnelle (le trigger utilisera l'anon key sinon)
- Le fallback frontend garantit que l'indexation se fait même si le trigger échoue

