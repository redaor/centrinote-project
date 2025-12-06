-- Script de test pour vérifier que le système de dédoublonnage fonctionne
-- À exécuter dans Supabase Dashboard → SQL Editor

-- 1. Vérifier que la table existe et est vide (ou contient des données)
SELECT 
  'Table email_sent_log' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent_log')
    THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as status,
  (SELECT COUNT(*) FROM email_sent_log) as row_count;

-- 2. Vérifier que la fonction existe
SELECT 
  'Fonction check_and_log_email_send' as check_item,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_log_email_send')
    THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as status;

-- 3. TEST : Appeler la fonction pour la première fois (devrait retourner TRUE et insérer)
SELECT 
  'Test 1: Premier appel' as test_name,
  check_and_log_email_send('test@example.com', 'Test Email Subject', 5) as can_send,
  (SELECT COUNT(*) FROM email_sent_log WHERE email_to = 'test@example.com' AND email_subject = 'Test Email Subject') as rows_inserted;

-- 4. TEST : Appeler la fonction une deuxième fois immédiatement (devrait retourner FALSE)
SELECT 
  'Test 2: Deuxième appel (doublon)' as test_name,
  check_and_log_email_send('test@example.com', 'Test Email Subject', 5) as can_send,
  (SELECT COUNT(*) FROM email_sent_log WHERE email_to = 'test@example.com' AND email_subject = 'Test Email Subject') as total_rows;

-- 5. Vérifier les données insérées
SELECT 
  'Données dans email_sent_log' as check_item,
  email_to,
  email_subject,
  sent_at,
  EXTRACT(EPOCH FROM (NOW() - sent_at)) / 60 as minutes_ago
FROM email_sent_log
WHERE email_to = 'test@example.com'
ORDER BY sent_at DESC;

-- 6. Nettoyer les données de test (optionnel)
-- DELETE FROM email_sent_log WHERE email_to = 'test@example.com';

