-- Migration: Création de la table user_issue_states pour le système de gestion de problèmes Noteo
-- Date: 2026-01-01
-- Description: Permet de suivre l'état des problèmes utilisateurs (reported → in_progress → resolved → escalated)

-- Créer la table user_issue_states
CREATE TABLE IF NOT EXISTS user_issue_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identifiant de la fonctionnalité concernée
  feature TEXT NOT NULL, -- ex: "note_creation", "vocabulary_add", "automation_create"

  -- État actuel du problème
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'in_progress', 'resolved', 'escalated')),

  -- Dernière étape validée par l'utilisateur
  last_step TEXT, -- ex: "opened_notes_menu", "clicked_new_note", "entered_title"

  -- Nombre de tentatives de résolution
  attempt_count INTEGER NOT NULL DEFAULT 0,

  -- Point de blocage identifié
  blocking_point TEXT, -- ex: "cannot_find_button", "error_on_save", "page_not_loading"

  -- Message original de l'utilisateur
  original_message TEXT NOT NULL,

  -- Historique des interactions (JSON array)
  interaction_history JSONB DEFAULT '[]'::jsonb,

  -- Métadonnées
  conversation_id UUID, -- Lien vers la conversation dans chat-memory
  ticket_id TEXT, -- ID du ticket support si escaladé

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  escalated_at TIMESTAMP WITH TIME ZONE
);

-- Index pour recherche rapide par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_issue_states_user_id ON user_issue_states(user_id);

-- Index pour recherche par statut
CREATE INDEX IF NOT EXISTS idx_user_issue_states_status ON user_issue_states(status);

-- Index pour recherche par feature
CREATE INDEX IF NOT EXISTS idx_user_issue_states_feature ON user_issue_states(feature);

-- Index composite pour trouver les problèmes actifs d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_user_issue_states_active ON user_issue_states(user_id, status) WHERE status IN ('reported', 'in_progress');

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_issue_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Mettre à jour resolved_at si le statut passe à resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;

  -- Mettre à jour escalated_at si le statut passe à escalated
  IF NEW.status = 'escalated' AND OLD.status != 'escalated' THEN
    NEW.escalated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS trigger_update_user_issue_states_updated_at ON user_issue_states;
CREATE TRIGGER trigger_update_user_issue_states_updated_at
  BEFORE UPDATE ON user_issue_states
  FOR EACH ROW
  EXECUTE FUNCTION update_user_issue_states_updated_at();

-- RLS (Row Level Security)
ALTER TABLE user_issue_states ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres problèmes
CREATE POLICY "Users can view their own issue states"
  ON user_issue_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent créer leurs propres problèmes
CREATE POLICY "Users can create their own issue states"
  ON user_issue_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres problèmes
CREATE POLICY "Users can update their own issue states"
  ON user_issue_states
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique : Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can view all issue states"
  ON user_issue_states
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Fonction helper : Récupérer les problèmes actifs d'un utilisateur
CREATE OR REPLACE FUNCTION get_active_user_issues(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  feature TEXT,
  status TEXT,
  last_step TEXT,
  attempt_count INTEGER,
  blocking_point TEXT,
  original_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uis.id,
    uis.feature,
    uis.status,
    uis.last_step,
    uis.attempt_count,
    uis.blocking_point,
    uis.original_message,
    uis.created_at,
    uis.updated_at
  FROM user_issue_states uis
  WHERE uis.user_id = p_user_id
    AND uis.status IN ('reported', 'in_progress')
  ORDER BY uis.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper : Marquer un problème comme résolu
CREATE OR REPLACE FUNCTION resolve_user_issue(p_issue_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE user_issue_states
  SET status = 'resolved'
  WHERE id = p_issue_id
    AND user_id = p_user_id
    AND status IN ('reported', 'in_progress');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction helper : Escalader un problème
CREATE OR REPLACE FUNCTION escalate_user_issue(
  p_issue_id UUID,
  p_user_id UUID,
  p_ticket_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE user_issue_states
  SET
    status = 'escalated',
    ticket_id = p_ticket_id
  WHERE id = p_issue_id
    AND user_id = p_user_id
    AND status IN ('reported', 'in_progress');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires pour documentation
COMMENT ON TABLE user_issue_states IS 'Suivi des problèmes utilisateurs pour le système Noteo (reported → in_progress → resolved → escalated)';
COMMENT ON COLUMN user_issue_states.feature IS 'Identifiant de la fonctionnalité (ex: note_creation, vocabulary_add)';
COMMENT ON COLUMN user_issue_states.status IS 'État actuel : reported (nouveau), in_progress (en cours de résolution), resolved (résolu), escalated (escaladé au support)';
COMMENT ON COLUMN user_issue_states.last_step IS 'Dernière étape validée par l''utilisateur';
COMMENT ON COLUMN user_issue_states.attempt_count IS 'Nombre de tentatives de résolution (escalade après 2-3)';
COMMENT ON COLUMN user_issue_states.blocking_point IS 'Point de blocage précis (ex: cannot_find_button, error_on_save)';
COMMENT ON COLUMN user_issue_states.interaction_history IS 'Historique JSON des interactions (boutons cliqués, réponses, etc.)';
