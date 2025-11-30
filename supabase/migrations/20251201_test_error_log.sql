-- =====================================================
-- SCRIPT DE TEST - Insérer une fausse erreur dans error_logs
-- =====================================================
-- Ce script permet de tester le système de logging d'erreurs
-- en insérant des erreurs de test dans la table error_logs

-- =====================================================
-- 1. ERREUR DE TEST - Frontend
-- =====================================================

INSERT INTO error_logs (
  user_id,
  message,
  level,
  meta,
  source,
  stack_trace,
  url,
  user_agent,
  created_at
) VALUES (
  NULL, -- Erreur non authentifiée
  'Test d''erreur frontend - Composant Dashboard',
  'error',
  '{
    "component": "Dashboard",
    "action": "loadData",
    "errorCode": "FETCH_ERROR",
    "endpoint": "/api/dashboard",
    "statusCode": 500
  }'::jsonb,
  'frontend',
  'Error: Failed to fetch
    at Dashboard.loadData (Dashboard.tsx:45)
    at useEffect (Dashboard.tsx:23)
    at React.render (react-dom.js:1234)',
  'https://centrinote.fr/dashboard',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  NOW() - INTERVAL '5 minutes'
);

-- =====================================================
-- 2. ERREUR DE TEST - Backend (Edge Function)
-- =====================================================

INSERT INTO error_logs (
  user_id,
  message,
  level,
  meta,
  source,
  stack_trace,
  url,
  user_agent,
  created_at
) VALUES (
  NULL,
  'Test d''erreur backend - Edge Function automation-access',
  'error',
  '{
    "function": "automation-access",
    "endpoint": "/api/user/automation-access",
    "errorType": "AUTH_ERROR",
    "statusCode": 401,
    "details": "Invalid token"
  }'::jsonb,
  'edge-function',
  'Error: Invalid token
    at verifyJWT (automation-access/index.ts:45)
    at serve (automation-access/index.ts:23)',
  'https://centrinote.fr/api/user/automation-access',
  'Supabase-Edge-Function/1.0',
  NOW() - INTERVAL '10 minutes'
);

-- =====================================================
-- 3. WARNING DE TEST - Frontend
-- =====================================================

INSERT INTO error_logs (
  user_id,
  message,
  level,
  meta,
  source,
  url,
  user_agent,
  created_at
) VALUES (
  NULL,
  'Test d''avertissement - Requête lente détectée',
  'warn',
  '{
    "component": "NotesManager",
    "action": "fetchNotes",
    "queryTime": 2500,
    "threshold": 1000,
    "noteCount": 150
  }'::jsonb,
  'frontend',
  'https://centrinote.fr/notes',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  NOW() - INTERVAL '15 minutes'
);

-- =====================================================
-- 4. INFO DE TEST - Frontend
-- =====================================================

INSERT INTO error_logs (
  user_id,
  message,
  level,
  meta,
  source,
  url,
  user_agent,
  created_at
) VALUES (
  NULL,
  'Test d''info - Utilisateur connecté avec succès',
  'info',
  '{
    "action": "userLogin",
    "method": "email",
    "timestamp": "2025-12-01T13:30:00Z"
  }'::jsonb,
  'frontend',
  'https://centrinote.fr/auth',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  NOW() - INTERVAL '20 minutes'
);

-- =====================================================
-- 5. ERREUR DE TEST - Avec user_id (si vous avez un utilisateur)
-- =====================================================

-- Remplacez 'VOTRE_USER_ID' par un UUID d'utilisateur réel si vous voulez tester avec un utilisateur
-- Vous pouvez obtenir un user_id avec : SELECT id FROM auth.users LIMIT 1;

/*
INSERT INTO error_logs (
  user_id,
  message,
  level,
  meta,
  source,
  stack_trace,
  url,
  user_agent,
  created_at
) VALUES (
  'VOTRE_USER_ID'::uuid, -- Remplacez par un UUID réel
  'Test d''erreur utilisateur - Échec de sauvegarde de note',
  'error',
  '{
    "component": "NoteEditor",
    "action": "saveNote",
    "noteId": "abc123-def456",
    "errorCode": "SAVE_ERROR",
    "details": "Network timeout"
  }'::jsonb,
  'frontend',
  'Error: Network timeout
    at NoteEditor.saveNote (NoteEditor.tsx:78)
    at handleSave (NoteEditor.tsx:45)',
  'https://centrinote.fr/notes/edit/abc123',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  NOW() - INTERVAL '2 minutes'
);
*/

-- =====================================================
-- 6. VÉRIFICATION
-- =====================================================

-- Vérifier que les erreurs ont été insérées
SELECT 
  id,
  level,
  message,
  source,
  created_at,
  CASE 
    WHEN user_id IS NULL THEN 'Non authentifié'
    ELSE 'Utilisateur: ' || LEFT(user_id::text, 8) || '...'
  END as user_info
FROM error_logs
WHERE message LIKE 'Test%'
ORDER BY created_at DESC;

-- =====================================================
-- 7. NETTOYAGE (optionnel - pour supprimer les tests)
-- =====================================================

-- Pour supprimer toutes les erreurs de test :
-- DELETE FROM error_logs WHERE message LIKE 'Test%';

-- =====================================================
-- RÉSUMÉ
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Erreurs de test insérées !';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Erreurs créées :';
  RAISE NOTICE '   1. Erreur frontend (Dashboard) - il y a 5 minutes';
  RAISE NOTICE '   2. Erreur backend (Edge Function) - il y a 10 minutes';
  RAISE NOTICE '   3. Warning frontend (Requête lente) - il y a 15 minutes';
  RAISE NOTICE '   4. Info frontend (Connexion) - il y a 20 minutes';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Pour voir les erreurs :';
  RAISE NOTICE '   - Aller sur /admin/support';
  RAISE NOTICE '   - Cliquer sur l''onglet "Logs d''erreurs"';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Pour nettoyer les tests :';
  RAISE NOTICE '   DELETE FROM error_logs WHERE message LIKE ''Test%'';';
  RAISE NOTICE '';
END $$;

