-- =====================================================
-- ADD EMAIL TIME PREFERENCE
-- Permet aux utilisateurs de choisir l'heure d'envoi de leurs emails
-- =====================================================

-- Ajouter la colonne email_time dans user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS email_time TIME DEFAULT '08:00';

-- Ajouter des colonnes pour désactiver certains types d'emails
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS quote_disabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS backup_disabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS session_completion_disabled BOOLEAN DEFAULT false;

-- Commentaires
COMMENT ON COLUMN user_preferences.email_time IS 'Heure à laquelle l''utilisateur souhaite recevoir ses emails automatiques (format HH:MM)';
COMMENT ON COLUMN user_preferences.quote_disabled IS 'Désactiver l''envoi de la citation quotidienne';
COMMENT ON COLUMN user_preferences.backup_disabled IS 'Désactiver le rappel de backup hebdomadaire';
COMMENT ON COLUMN user_preferences.session_completion_disabled IS 'Désactiver les emails de fin de session';

-- Index pour optimiser la recherche par heure
CREATE INDEX IF NOT EXISTS idx_user_preferences_email_time ON user_preferences(email_time) WHERE email_time IS NOT NULL;
