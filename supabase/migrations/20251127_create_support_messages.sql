-- Table pour stocker les messages de support
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'resolu')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour accélérer les recherches par statut et date
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_support_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_support_messages_updated_at ON support_messages;
CREATE TRIGGER trigger_update_support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_messages_updated_at();

-- RLS (Row Level Security)
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les admins peuvent voir et modifier les messages
CREATE POLICY "Admins can view all support messages"
  ON support_messages
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

CREATE POLICY "Admins can update support messages"
  ON support_messages
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

-- Politique : La fonction serverless peut insérer (via service role key)
CREATE POLICY "Service role can insert support messages"
  ON support_messages
  FOR INSERT
  WITH CHECK (true);

-- Commentaires pour documentation
COMMENT ON TABLE support_messages IS 'Messages de support envoyés par les utilisateurs';
COMMENT ON COLUMN support_messages.status IS 'Statut du message : nouveau, en_cours, resolu';
