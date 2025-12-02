-- ============================================================================
-- VÉRIFICATION: Le trigger index-vocabulary est-il appelé ?
-- ============================================================================
-- Ce script vérifie si le trigger est actif et s'il est appelé
-- ============================================================================

-- 1. Vérifier que pg_net est activé
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ Extension pg_net est activée'
    ELSE '❌ Extension pg_net N''EST PAS activée'
  END AS status_pg_net;

-- 2. Vérifier que le trigger existe et est actif
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ Actif'
    WHEN 'D' THEN '❌ Désactivé'
    WHEN 'A' THEN '⚠️ Désactivé pour réplication'
    ELSE '⚠️ Inconnu'
  END AS status,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_auto_index_vocabulary';

-- 3. Vérifier les requêtes HTTP récentes (si pg_net est configuré)
-- Cela montre si le trigger a appelé l'Edge Function
-- Note: La structure de net.http_request_queue peut varier selon la version de pg_net
SELECT 
  id,
  url,
  method,
  created_at,
  error_msg,
  CASE 
    WHEN url LIKE '%index-vocabulary%' THEN '✅ Appel index-vocabulary détecté'
    ELSE 'Autre requête'
  END AS type_requete
FROM net.http_request_queue
WHERE url LIKE '%index-vocabulary%'
ORDER BY created_at DESC
LIMIT 20;

-- 3b. Vérifier la structure de la table (pour debug)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'net' 
  AND table_name = 'http_request_queue'
ORDER BY ordinal_position;

-- 4. Compter les requêtes index-vocabulary dans les dernières 24h
SELECT 
  COUNT(*) AS nombre_appels,
  COUNT(CASE WHEN error_msg IS NULL THEN 1 END) AS appels_reussis,
  COUNT(CASE WHEN error_msg IS NOT NULL THEN 1 END) AS appels_echoues,
  MAX(created_at) AS dernier_appel
FROM net.http_request_queue
WHERE url LIKE '%index-vocabulary%'
  AND created_at > NOW() - INTERVAL '24 hours';

-- 5. Vérifier les settings Supabase
SELECT 
  name,
  CASE 
    WHEN name = 'app.settings.supabase_url' AND setting IS NOT NULL THEN '✅ Configuré: ' || LEFT(setting, 30) || '...'
    WHEN name = 'app.settings.supabase_url' AND setting IS NULL THEN '❌ Non configuré'
    WHEN name = 'app.settings.service_role_key' AND setting IS NOT NULL THEN '✅ Configuré (masqué)'
    WHEN name = 'app.settings.service_role_key' AND setting IS NULL THEN '⚠️ Non configuré'
    ELSE 'N/A'
  END AS status
FROM pg_settings
WHERE name LIKE 'app.settings%';

-- 6. Test: Créer un vocabulaire de test pour déclencher le trigger
-- (Décommentez pour tester)
/*
DO $$
DECLARE
  test_user_id UUID := 'f44ef9d5-7a30-45b3-911b-c7f63a44a2c5';  -- Votre user_id
  new_vocab_id UUID;
BEGIN
  -- Insérer un vocabulaire de test
  INSERT INTO vocabulary (
    "userId",
    word,
    definition,
    category
  ) VALUES (
    test_user_id,
    'test-trigger-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Ceci est un test pour vérifier que le trigger fonctionne',
    'Test'
  ) RETURNING id INTO new_vocab_id;
  
  RAISE NOTICE '✅ Vocabulaire de test créé avec ID: %', new_vocab_id;
  RAISE NOTICE '⏳ Attendez 2-3 secondes puis vérifiez les requêtes HTTP (requête 3)';
  
  -- Attendre 3 secondes pour que le trigger s'exécute
  PERFORM pg_sleep(3);
  
  -- Vérifier si une requête a été créée
  IF EXISTS (
    SELECT 1 FROM net.http_request_queue
    WHERE url LIKE '%index-vocabulary%'
      AND created_at > NOW() - INTERVAL '5 seconds'
  ) THEN
    RAISE NOTICE '✅ Le trigger a bien appelé l''Edge Function !';
    
    -- Afficher les détails de la requête
    FOR rec IN (
      SELECT url, method, created_at, error_msg
      FROM net.http_request_queue
      WHERE url LIKE '%index-vocabulary%'
        AND created_at > NOW() - INTERVAL '5 seconds'
      ORDER BY created_at DESC
      LIMIT 1
    ) LOOP
      RAISE NOTICE '📋 Détails: URL=%, Method=%, Error=%', rec.url, rec.method, COALESCE(rec.error_msg, 'Aucune erreur');
    END LOOP;
  ELSE
    RAISE WARNING '❌ Aucun appel détecté. Le trigger ne fonctionne peut-être pas.';
    RAISE NOTICE '💡 Vérifiez: 1) Les settings Supabase sont-ils configurés? 2) La service key est-elle valide?';
  END IF;
END $$;
*/

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Exécutez toutes les requêtes pour vérifier l'état du système
-- 2. Si le trigger n'est pas actif, exécutez CONFIGURER_TRIGGER_INDEX_VOCABULARY.sql
-- 3. Pour tester manuellement, décommentez la requête 6
-- 4. Vérifiez les logs dans Supabase Dashboard > Edge Functions > index-vocabulary
-- ============================================================================

