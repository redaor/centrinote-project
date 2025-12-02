-- ============================================================================
-- Configuration des Settings Supabase pour le trigger index-vocabulary
-- ============================================================================
-- ⚠️ ATTENTION: Ce script nécessite des privilèges super-utilisateur
-- Si vous avez une erreur "permission denied", utilisez plutôt FIX_TRIGGER_VOCABULARY_URL.sql
-- ============================================================================

-- 1. Configurer l'URL Supabase (nécessite privilèges super-utilisateur)
-- ⚠️ Si vous avez une erreur de permission, utilisez FIX_TRIGGER_VOCABULARY_URL.sql à la place
-- Remplacez wjzlicokhxitmeoxkjzv par votre vraie référence de projet si différente
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://wjzlicokhxitmeoxkjzv.supabase.co';

-- 2. Vérifier que l'URL est bien configurée
SELECT 
  name,
  setting,
  CASE 
    WHEN name = 'app.settings.supabase_url' AND setting IS NOT NULL 
    THEN '✅ Configuré: ' || setting
    ELSE '❌ Non configuré'
  END AS status
FROM pg_settings
WHERE name = 'app.settings.supabase_url';

-- 3. (Optionnel) Configurer la Service Role Key
-- ⚠️ ATTENTION: Ne stockez JAMAIS la service key dans le code source
-- Pour obtenir votre service key:
-- 1. Allez dans Supabase Dashboard > Settings > API
-- 2. Copiez la "service_role" key (pas l'anon key)
-- 3. Exécutez la commande ci-dessous avec votre key
-- 
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY_ICI';
--
-- Si vous ne configurez pas la service key, le trigger utilisera l'anon key (moins sécurisé)

-- 4. Vérifier tous les settings configurés
SELECT 
  name,
  CASE 
    WHEN name = 'app.settings.supabase_url' AND setting IS NOT NULL 
    THEN '✅ Configuré'
    WHEN name = 'app.settings.supabase_url' AND setting IS NULL 
    THEN '❌ Non configuré'
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL 
    THEN '✅ Configuré (masqué)'
    WHEN name = 'app.settings.service_role_key' AND setting IS NULL 
    THEN '⚠️ Non configuré (utilisera anon key)'
    ELSE 'N/A'
  END AS status,
  CASE 
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL 
    THEN '***MASQUÉ***'
    ELSE setting
  END AS valeur
FROM pg_settings
WHERE name LIKE 'app.settings%';

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez la requête 1 pour configurer l'URL Supabase
-- 2. (Optionnel) Exécutez la requête 3 pour configurer la service key
-- 3. Vérifiez avec la requête 4 que tout est bien configuré
-- 4. Testez ensuite avec TEST_TRIGGER_VOCABULARY_DIRECT.sql
-- ============================================================================

