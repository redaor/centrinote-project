-- =====================================================
-- Table chat_memory : Mémoire persistante pour l'IA
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  summary TEXT, -- Résumé de la conversation
  key_topics TEXT[], -- Concepts clés abordés
  language TEXT DEFAULT 'fr', -- Langue détectée (fr, ar, en, etc.)
  mood TEXT, -- Humeur/tone détecté (optionnel)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id) -- Une mémoire par session
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_session ON chat_memory(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_id ON chat_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_memory_updated_at ON chat_memory(updated_at DESC);

-- RLS (Row Level Security)
ALTER TABLE chat_memory ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leur propre mémoire
CREATE POLICY "Users can view own chat memory"
ON chat_memory
FOR SELECT
USING (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent insérer leur propre mémoire
CREATE POLICY "Users can insert own chat memory"
ON chat_memory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent mettre à jour leur propre mémoire
CREATE POLICY "Users can update own chat memory"
ON chat_memory
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique : Service role peut tout faire (pour Edge Functions)
CREATE POLICY "Service role can manage all chat memory"
ON chat_memory
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_chat_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_memory_updated_at
  BEFORE UPDATE ON chat_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_memory_updated_at();

-- Commentaires
COMMENT ON TABLE chat_memory IS 'Mémoire persistante des conversations IA pour personnalisation';
COMMENT ON COLUMN chat_memory.summary IS 'Résumé de la conversation pour contexte futur';
COMMENT ON COLUMN chat_memory.key_topics IS 'Concepts clés abordés dans la conversation';
COMMENT ON COLUMN chat_memory.language IS 'Langue détectée (fr, ar, en, etc.)';
COMMENT ON COLUMN chat_memory.mood IS 'Humeur/tone détecté (optionnel)';

