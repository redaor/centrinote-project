-- AI Assistant Plugin Tables
-- Migration: 20251116_ai_plugin
-- Description: Tables pour quota, rate-limiting et audit des requêtes IA

-- Table ai_usage: Suivi du quota utilisateur (50 requêtes / 24h)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quota INT NOT NULL DEFAULT 50,
  used INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour nettoyage périodique des quotas expirés
CREATE INDEX IF NOT EXISTS idx_ai_usage_expires_at ON ai_usage(expires_at);

-- Table ai_audit_log: Logs d'audit pour chaque action IA
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('reformuler', 'resumer', 'rechercher', 'ameliorer', 'definir')),
  tokens INT NOT NULL DEFAULT 0,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour requêtes par utilisateur et par date
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user_id ON ai_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created_at ON ai_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user_created ON ai_audit_log(user_id, created_at DESC);

-- Fonction pour incrémenter l'usage (appelée depuis l'edge function)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage (user_id, quota, used, expires_at)
  VALUES (
    p_user_id,
    50,
    1,
    NOW() + INTERVAL '24 hours'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET used = ai_usage.used + 1,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politique RLS pour ai_usage (lecture seule pour l'utilisateur)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own quota" ON ai_usage;
CREATE POLICY "Users can view their own quota"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Politique RLS pour ai_audit_log (lecture seule pour l'utilisateur)
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audit logs" ON ai_audit_log;
CREATE POLICY "Users can view their own audit logs"
  ON ai_audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- Fonction de nettoyage automatique des quotas expirés (à exécuter via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_quotas()
RETURNS VOID AS $$
BEGIN
  DELETE FROM ai_usage WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires pour documentation
COMMENT ON TABLE ai_usage IS 'Quota IA par utilisateur: 50 requêtes / 24h';
COMMENT ON TABLE ai_audit_log IS 'Logs d''audit pour chaque action IA (conformité RGPD)';
COMMENT ON FUNCTION increment_ai_usage IS 'Incrémente le compteur d''usage IA pour un utilisateur';
COMMENT ON FUNCTION cleanup_expired_ai_quotas IS 'Nettoie les quotas expirés (à exécuter quotidiennement via pg_cron)';
