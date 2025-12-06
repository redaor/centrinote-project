-- Migration: Création de la table support_tickets pour le système de chatbot

-- Table pour stocker les tickets de support
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT NOT NULL DEFAULT 'chatbot' CHECK (source IN ('chatbot', 'email', 'form', 'admin')),
  escalated BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON support_tickets(source);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- RLS (Row Level Security)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir leurs propres tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres tickets
CREATE POLICY "Users can create their own tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Politique: Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all tickets"
  ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.email = 'contact@centrinote.fr' OR auth.users.email = 'reda_sahraoui@outlook.fr')
    )
  );

-- Commentaires
COMMENT ON TABLE support_tickets IS 'Tickets de support créés via le chatbot ou autres sources';
COMMENT ON COLUMN support_tickets.user_id IS 'ID de l''utilisateur (peut être NULL pour les utilisateurs anonymes)';
COMMENT ON COLUMN support_tickets.escalated IS 'Indique si le ticket a été escaladé depuis le chatbot';
COMMENT ON COLUMN support_tickets.source IS 'Source du ticket: chatbot, email, form, admin';

