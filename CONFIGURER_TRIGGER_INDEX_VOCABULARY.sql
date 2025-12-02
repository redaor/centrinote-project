-- ============================================================================
-- Configuration du Trigger pour index-vocabulary
-- ============================================================================
-- Ce script configure les settings nécessaires pour que le trigger fonctionne
-- ============================================================================

-- 1. Activer pg_net si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Configurer l'URL Supabase
-- Remplacez YOUR_PROJECT_REF par votre vraie référence de projet
-- Exemple: wjzlicokhxitmeoxkjzv
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- 3. Configurer la Service Role Key (optionnel mais recommandé)
-- ⚠️ ATTENTION: Ne stockez JAMAIS la service key dans le code source
-- Utilisez plutôt les secrets Supabase dans le Dashboard
-- Pour tester, vous pouvez la configurer temporairement:
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';

-- 4. Vérifier les settings configurés
SELECT 
  name,
  setting,
  CASE 
    WHEN name = 'app.settings.supabase_url' AND setting IS NOT NULL THEN '✅ Configuré'
    WHEN name = 'app.settings.supabase_url' AND setting IS NULL THEN '❌ Non configuré'
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL THEN '✅ Configuré (masqué)'
    WHEN name = 'app.settings.service_role_key' AND setting IS NULL THEN '⚠️ Non configuré (utilisera anon key)'
    ELSE 'N/A'
  END AS status
FROM pg_settings
WHERE name LIKE 'app.settings%';

-- 5. Vérifier que le trigger existe et est actif
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ Actif'
    WHEN 'D' THEN '❌ Désactivé'
    ELSE '⚠️ Inconnu'
  END AS status,
  tgenabled AS enabled_code
FROM pg_trigger
WHERE tgname = 'trigger_auto_index_vocabulary';

-- 6. Test: Créer un vocabulaire de test pour déclencher le trigger
-- (Optionnel - pour tester que le trigger fonctionne)
/*
INSERT INTO vocabulary (
  "userId",
  word,
  definition,
  category
) VALUES (
  'VOTRE_USER_ID',  -- Remplacez par votre user_id
  'test-trigger',
  'Ceci est un test pour vérifier que le trigger fonctionne',
  'Test'
) RETURNING id, word;
*/

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Remplacez 'YOUR_PROJECT_REF' par votre référence de projet Supabase
--    (trouvable dans l'URL de votre projet: https://YOUR_PROJECT_REF.supabase.co)
-- 2. (Optionnel) Configurez la service_role_key si vous voulez utiliser le trigger
--    Sinon, le fallback frontend fonctionnera quand même
-- 3. Exécutez les requêtes pour vérifier la configuration
-- ============================================================================

