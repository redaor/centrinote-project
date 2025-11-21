-- =====================================================
-- CONFIGURER LES PARAMÈTRES SUPABASE POUR PG_CRON
-- À exécuter dans Supabase Dashboard → SQL Editor (PRODUCTION)
-- =====================================================

-- ⚠️ REMPLACER ces valeurs par vos vraies valeurs Supabase PRODUCTION
-- Settings → API → Project URL et Service Role Key

-- Méthode 1 : Configuration au niveau de la session (temporaire)
SET app.settings.supabase_url = 'https://wjzlicokhxitmeoxkjzv.supabase.co';  -- ⚠️ REMPLACER
SET app.settings.supabase_service_role_key = 'VOTRE_SERVICE_ROLE_KEY_ICI';  -- ⚠️ REMPLACER

-- Méthode 2 : Configuration permanente au niveau de la base de données
-- (Nécessite les droits superuser, peut ne pas fonctionner sur Supabase)
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://wjzlicokhxitmeoxkjzv.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'VOTRE_SERVICE_ROLE_KEY_ICI';

-- Vérifier que les paramètres sont configurés
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_service_role_key;

-- Note : Sur Supabase, il est recommandé d'utiliser directement les valeurs
-- dans les scripts plutôt que les paramètres de configuration

