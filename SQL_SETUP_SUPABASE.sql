-- 🗄️ Script SQL pour Netlify Functions - Supabase Setup
-- Tables requises pour l'API Centrinote
-- =====================================================

-- 🔑 Table pour les clés API
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL DEFAULT 'cnt_live_',
  permissions TEXT[] DEFAULT ARRAY['reports:write'],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 📊 Table pour les rapports de réunion
CREATE TABLE IF NOT EXISTS meeting_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id VARCHAR(255) NOT NULL UNIQUE,
  room_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) DEFAULT 'meeting_report',
  report_data JSONB NOT NULL,
  participant_emails TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📝 Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_reports_room ON meeting_reports(room_name);
CREATE INDEX IF NOT EXISTS idx_reports_created ON meeting_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_type ON meeting_reports(report_type);

-- 🔧 RLS (Row Level Security) - Optionnel mais recommandé
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_reports ENABLE ROW LEVEL SECURITY;

-- 🔐 Politique RLS pour les clés API (accès service uniquement)
CREATE POLICY "Service access only" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- 📊 Politique RLS pour les rapports (accès service uniquement)  
CREATE POLICY "Service access only" ON meeting_reports
  FOR ALL USING (auth.role() = 'service_role');

-- 🧪 Données de test (optionnel - à supprimer en production)
-- Insérer une clé API de test pour le diagnostic
-- Hash de 'cnt_live_test123456789abcdef' = sha256
INSERT INTO api_keys (
  name,
  key_hash,
  key_prefix,
  permissions,
  metadata
) VALUES (
  'Clé de Test Diagnostic',
  'f8c3de3d996dd5f6b76ea7e7c0b3b6f3f1b5d85eb96b3f0ea4e4a4e4e4e4e4e4', -- Hash fictif
  'cnt_live_',
  ARRAY['reports:write', 'reports:read'],
  '{"purpose": "diagnostic", "created_by": "setup_script"}'::jsonb
) ON CONFLICT (key_hash) DO NOTHING;

-- 📊 Vérification des tables créées
SELECT 'Tables créées avec succès:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('api_keys', 'meeting_reports');

-- 🔍 Vérification des index
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('api_keys', 'meeting_reports') 
AND schemaname = 'public';

-- 📝 Affichage du nombre d'enregistrements
SELECT 
  (SELECT COUNT(*) FROM api_keys) as api_keys_count,
  (SELECT COUNT(*) FROM meeting_reports) as reports_count;