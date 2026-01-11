-- ========================================
-- TEST DE SUPPRESSION DE COMPTE
-- ========================================
-- Ce script permet de vérifier qu'un compte a bien été supprimé
-- de TOUTES les tables de la base de données
-- ========================================

-- ========================================
-- SECTION 1: VÉRIFIER UN UTILISATEUR SPÉCIFIQUE
-- ========================================
-- Remplace 'USER_ID_ICI' par l'ID de l'utilisateur à vérifier

-- 1. Vérifier auth.users
SELECT 'auth.users' as table_name, COUNT(*) as count
FROM auth.users
WHERE id = 'USER_ID_ICI';

-- 2. Vérifier profiles
SELECT 'profiles' as table_name, COUNT(*) as count
FROM profiles
WHERE id = 'USER_ID_ICI';

-- 3. Vérifier user_quotas
SELECT 'user_quotas' as table_name, COUNT(*) as count
FROM user_quotas
WHERE user_id = 'USER_ID_ICI';

-- 4. Vérifier user_subscriptions
SELECT 'user_subscriptions' as table_name, COUNT(*) as count
FROM user_subscriptions
WHERE user_id = 'USER_ID_ICI';

-- 5. Vérifier notes
SELECT 'notes' as table_name, COUNT(*) as count
FROM notes
WHERE user_id = 'USER_ID_ICI';

-- 6. Vérifier documents
SELECT 'documents' as table_name, COUNT(*) as count
FROM documents
WHERE user_id = 'USER_ID_ICI';

-- 7. Vérifier vocabulary
SELECT 'vocabulary' as table_name, COUNT(*) as count
FROM vocabulary
WHERE user_id = 'USER_ID_ICI';

-- 8. Vérifier study_sessions
SELECT 'study_sessions' as table_name, COUNT(*) as count
FROM study_sessions
WHERE user_id = 'USER_ID_ICI';

-- 9. Vérifier meetings
SELECT 'meetings' as table_name, COUNT(*) as count
FROM meetings
WHERE user_id = 'USER_ID_ICI';

-- 10. Vérifier ai_conversations
SELECT 'ai_conversations' as table_name, COUNT(*) as count
FROM ai_conversations
WHERE user_id = 'USER_ID_ICI';

-- 11. Vérifier user_automations
SELECT 'user_automations' as table_name, COUNT(*) as count
FROM user_automations
WHERE user_id = 'USER_ID_ICI';

-- 12. Vérifier tasks
SELECT 'tasks' as table_name, COUNT(*) as count
FROM tasks
WHERE user_id = 'USER_ID_ICI';

-- ========================================
-- SECTION 2: VÉRIFICATION GLOBALE (UNION)
-- ========================================
-- Affiche toutes les tables qui contiennent encore des données
-- pour l'utilisateur spécifié

WITH user_data AS (
  SELECT 'auth.users' as table_name, COUNT(*) as count
  FROM auth.users WHERE id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'profiles', COUNT(*)
  FROM profiles WHERE id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'user_quotas', COUNT(*)
  FROM user_quotas WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'user_subscriptions', COUNT(*)
  FROM user_subscriptions WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'notes', COUNT(*)
  FROM notes WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'documents', COUNT(*)
  FROM documents WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'vocabulary', COUNT(*)
  FROM vocabulary WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'study_sessions', COUNT(*)
  FROM study_sessions WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'meetings', COUNT(*)
  FROM meetings WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'ai_conversations', COUNT(*)
  FROM ai_conversations WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'user_automations', COUNT(*)
  FROM user_automations WHERE user_id = 'USER_ID_ICI'

  UNION ALL

  SELECT 'tasks', COUNT(*)
  FROM tasks WHERE user_id = 'USER_ID_ICI'
)
SELECT
  table_name,
  count,
  CASE
    WHEN count = 0 THEN '✅ Supprimé'
    ELSE '❌ RESTE EN BASE'
  END as status
FROM user_data
ORDER BY count DESC, table_name;

-- RÉSULTAT ATTENDU APRÈS SUPPRESSION :
-- | table_name          | count | status          |
-- |---------------------|-------|-----------------|
-- | auth.users          | 0     | ✅ Supprimé     |
-- | profiles            | 0     | ✅ Supprimé     |
-- | user_quotas         | 0     | ✅ Supprimé     |
-- | user_subscriptions  | 0     | ✅ Supprimé     |
-- | notes               | 0     | ✅ Supprimé     |
-- | documents           | 0     | ✅ Supprimé     |
-- | vocabulary          | 0     | ✅ Supprimé     |
-- | study_sessions      | 0     | ✅ Supprimé     |
-- | meetings            | 0     | ✅ Supprimé     |
-- | ai_conversations    | 0     | ✅ Supprimé     |
-- | user_automations    | 0     | ✅ Supprimé     |
-- | tasks               | 0     | ✅ Supprimé     |

-- ========================================
-- SECTION 3: VÉRIFIER TOUTES LES TABLES
-- ========================================
-- Affiche TOUTES les tables qui ont une colonne user_id
-- et compte combien d'enregistrements restent pour l'utilisateur

DO $$
DECLARE
  table_record RECORD;
  count_query TEXT;
  result_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION COMPLÈTE POUR USER_ID_ICI';
  RAISE NOTICE '========================================';

  FOR table_record IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name = 'user_id' OR column_name = 'id')
      AND table_name NOT LIKE '%_pkey'
    ORDER BY table_name
  LOOP
    -- Construire la requête de comptage
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = table_record.table_name
        AND column_name = 'user_id'
    ) THEN
      count_query := FORMAT('SELECT COUNT(*) FROM %I WHERE user_id = ''USER_ID_ICI''', table_record.table_name);
    ELSIF table_record.table_name IN ('profiles', 'auth.users') THEN
      count_query := FORMAT('SELECT COUNT(*) FROM %I WHERE id = ''USER_ID_ICI''', table_record.table_name);
    ELSE
      CONTINUE;
    END IF;

    -- Exécuter la requête
    EXECUTE count_query INTO result_count;

    -- Afficher le résultat
    IF result_count > 0 THEN
      RAISE NOTICE '❌ % : % enregistrements RESTENT', table_record.table_name, result_count;
    ELSE
      RAISE NOTICE '✅ % : 0 enregistrement (supprimé)', table_record.table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- SECTION 4: TESTER LA SUPPRESSION AVEC UN COMPTE DE TEST
-- ========================================
-- ⚠️ ATTENTION : Cette section va créer puis SUPPRIMER un utilisateur de test
-- ⚠️ NE PAS EXÉCUTER sur un compte réel

-- 1. Créer un utilisateur de test (via Supabase Dashboard ou Auth API)
-- 2. Noter son user_id
-- 3. Ajouter des données de test
-- 4. Appeler l'Edge Function delete-user-account
-- 5. Exécuter les requêtes ci-dessus pour vérifier

-- Exemple de création de données de test :
/*
-- Insérer un quota de test
INSERT INTO user_quotas (user_id, feature, usage_count, usage_month)
VALUES ('TEST_USER_ID', 'ai_help_count', 1, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));

-- Insérer un abonnement de test
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT 'TEST_USER_ID', id, 'active'
FROM subscription_plans WHERE name = 'free';

-- Insérer une note de test
INSERT INTO notes (user_id, title, content)
VALUES ('TEST_USER_ID', 'Test Note', 'This is a test note');

-- Vérifier que les données existent
SELECT COUNT(*) FROM user_quotas WHERE user_id = 'TEST_USER_ID';
SELECT COUNT(*) FROM user_subscriptions WHERE user_id = 'TEST_USER_ID';
SELECT COUNT(*) FROM notes WHERE user_id = 'TEST_USER_ID';

-- Maintenant, appeler l'Edge Function pour supprimer le compte
-- Puis ré-exécuter les requêtes ci-dessus → Toutes doivent retourner 0
*/

-- ========================================
-- SECTION 5: VÉRIFIER LES LOGS DE SUPPRESSION
-- ========================================
-- Les logs de l'Edge Function peuvent être consultés via :
-- supabase functions logs delete-user-account --tail

-- Ou via le Dashboard Supabase :
-- Project → Edge Functions → delete-user-account → Logs

-- Logs attendus :
-- 🗑️ Début de la suppression du compte utilisateur: xxx
-- 📊 Suppression des quotas utilisateur...
-- 💳 Suppression des abonnements utilisateur...
-- 📄 Suppression des notes...
-- ...
-- 👤 Suppression du compte utilisateur...
-- ✅ Compte utilisateur supprimé avec succès

-- ========================================
-- SECTION 6: ROLLBACK (ANNULER UNE SUPPRESSION)
-- ========================================
-- ⚠️ IMPOSSIBLE : Une fois le compte supprimé de auth.users, il est définitivement perdu
-- ⚠️ Il n'y a PAS de backup automatique avant suppression
-- ⚠️ La seule protection est la confirmation "SUPPRIMER" dans l'UI

-- Si vous avez besoin de restaurer un compte :
-- 1. Créer un nouveau compte avec le même email
-- 2. Restaurer les données depuis un backup manuel (si disponible)
-- 3. Réassigner les données via les IDs

-- C'est pourquoi la confirmation est OBLIGATOIRE et STRICTE ("SUPPRIMER" en majuscules)

-- ========================================
-- SECTION 7: STATISTIQUES POST-SUPPRESSION
-- ========================================
-- Vérifier combien d'utilisateurs ont été supprimés récemment

-- Cette requête ne fonctionnera QUE si vous avez un log de suppression
-- (non implémenté par défaut)

-- Pour implémenter un log de suppression, créer une table :
/*
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id UUID NOT NULL,
  deleted_email TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  tables_deleted TEXT[],
  metadata JSONB
);

-- Puis modifier l'Edge Function pour insérer un log avant de supprimer
*/

-- ========================================
-- NOTES IMPORTANTES
-- ========================================

-- 1. PGRST116 : Code d'erreur "No rows found"
--    → Normal si la table est vide, ne pas bloquer

-- 2. ON DELETE CASCADE :
--    → profiles est automatiquement supprimé quand auth.users est supprimé
--    → Pas besoin de le supprimer manuellement

-- 3. Ordre de suppression :
--    → Enfants d'abord (tables avec FK)
--    → Parents ensuite (tables référencées)
--    → auth.users en dernier (déclenche CASCADE)

-- 4. Service role :
--    → Seule l'Edge Function a le service_role
--    → Le frontend ne peut PAS supprimer directement
--    → C'est une mesure de sécurité importante

-- 5. Test recommandé :
--    → Créer un compte de test
--    → Ajouter des données dans plusieurs tables
--    → Supprimer via l'UI
--    → Exécuter ce script SQL pour vérifier
--    → count = 0 partout = ✅ Succès
