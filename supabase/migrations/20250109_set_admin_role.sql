-- ==========================================
-- SCRIPT POUR ASSIGNER LE RÔLE ADMIN
-- ==========================================
-- Ce script permet d'assigner le rôle 'admin' à un utilisateur
-- 
-- UTILISATION:
-- 1. Remplacez 'email@example.com' par l'email de l'utilisateur à promouvoir
-- 2. Exécutez ce script dans l'éditeur SQL de Supabase
--
-- ALTERNATIVE: Utilisez la requête SQL directement dans Supabase Dashboard
-- UPDATE profiles SET role = 'admin' WHERE email = 'email@example.com';

-- Exemple: Promouvoir un utilisateur en admin par email
-- UPDATE profiles 
-- SET role = 'admin', updated_at = now()
-- WHERE email = 'redasahraoui1@gmail.com';

-- Exemple: Promouvoir un utilisateur en admin par ID
-- UPDATE profiles 
-- SET role = 'admin', updated_at = now()
-- WHERE id = 'uuid-de-l-utilisateur';

-- Vérifier les administrateurs actuels
-- SELECT id, email, name, role, subscription, created_at
-- FROM profiles
-- WHERE role = 'admin';

-- Retirer le rôle admin (retour à 'user')
-- UPDATE profiles 
-- SET role = 'user', updated_at = now()
-- WHERE email = 'email@example.com';



