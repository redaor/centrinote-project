-- Migration: Ajouter recording_ready_at à la table meetings
-- Date: 2025-02-17
-- Description: Ajoute un timestamp pour savoir quand l'URL d'enregistrement a été récupérée

-- Ajouter la colonne recording_ready_at
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS recording_ready_at TIMESTAMPTZ;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_meetings_recording_ready
  ON meetings(recording_ready_at)
  WHERE recording_ready_at IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN meetings.recording_ready_at IS 'Timestamp indiquant quand l''URL d''enregistrement a été récupérée depuis Daily.co';
