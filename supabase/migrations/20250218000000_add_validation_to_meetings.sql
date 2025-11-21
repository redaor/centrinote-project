-- Migration pour ajouter les colonnes de validation aux résumés de réunion
-- Created: 2025-02-18

-- Ajouter les colonnes validated_by et validated_at à la table meetings
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_meetings_validated_by ON meetings(validated_by);
CREATE INDEX IF NOT EXISTS idx_meetings_validated_at ON meetings(validated_at);

-- Commentaires pour documentation
COMMENT ON COLUMN meetings.validated_by IS 'ID de l''utilisateur qui a validé le résumé';
COMMENT ON COLUMN meetings.validated_at IS 'Date et heure de validation du résumé';
