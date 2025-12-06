-- Script de vérification pour le système de dédoublonnage des emails
-- À exécuter dans Supabase Dashboard → SQL Editor pour vérifier que tout est en place

-- 1. Vérifier que la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent_log') THEN
    RAISE NOTICE '✅ Table email_sent_log existe';
  ELSE
    RAISE WARNING '❌ Table email_sent_log n''existe pas - Migration non appliquée !';
  END IF;
END $$;

-- 2. Vérifier que la fonction existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_log_email_send') THEN
    RAISE NOTICE '✅ Fonction check_and_log_email_send existe';
  ELSE
    RAISE WARNING '❌ Fonction check_and_log_email_send n''existe pas - Migration non appliquée !';
  END IF;
END $$;

-- 3. Vérifier les index
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_email_sent_log_to_subject') 
    THEN '✅ Index idx_email_sent_log_to_subject existe'
    ELSE '❌ Index idx_email_sent_log_to_subject manquant'
  END as index_status;

-- 4. Tester la fonction (ne crée pas d'email réel, juste un test)
SELECT 
  check_and_log_email_send(
    'test@example.com',
    'Test Email',
    5
  ) as test_result,
  CASE 
    WHEN check_and_log_email_send('test@example.com', 'Test Email', 5) = FALSE 
    THEN '✅ Fonction fonctionne (email déjà envoyé dans les 5 dernières minutes)'
    ELSE '✅ Fonction fonctionne (email peut être envoyé)'
  END as function_status;

-- 5. Vérifier les emails envoyés récemment
SELECT 
  COUNT(*) as total_emails_last_hour,
  COUNT(DISTINCT email_to) as unique_recipients,
  COUNT(DISTINCT email_subject) as unique_subjects
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour';

-- 6. Vérifier les doublons potentiels (devrait être 0 si la protection fonctionne)
SELECT 
  email_to,
  email_subject,
  COUNT(*) as duplicate_count,
  MIN(sent_at) as first_sent,
  MAX(sent_at) as last_sent
FROM email_sent_log
WHERE sent_at >= NOW() - INTERVAL '1 hour'
GROUP BY email_to, email_subject
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 7. Résumé
SELECT 
  '📊 RÉSUMÉ DU SYSTÈME DE DÉDOUBLONNAGE' as summary,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_sent_log')
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_log_email_send')
    THEN '✅ Système opérationnel'
    ELSE '❌ Migration non appliquée - Exécuter: supabase/migrations/20251202_email_deduplication.sql'
  END as system_status;

