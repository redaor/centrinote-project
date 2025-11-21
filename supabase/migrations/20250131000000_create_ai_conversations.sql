/*
  # Création de la table ai_conversations
  
  1. Nouvelle Table
    - `ai_conversations`
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, non null, référence à auth.users)
      - `session_id` (uuid, identifiant unique de session)
      - `message_id` (uuid, identifiant unique du message)
      - `message_type` (text, non null: 'user' | 'ai' | 'error' | 'code')
      - `content` (text, non null, contenu du message)
      - `metadata` (jsonb, métadonnées optionnelles)
      - `created_at` (timestamp with time zone, valeur par défaut now())
      
  2. Sécurité
    - Activation de RLS sur la table
    - Policies pour permettre aux utilisateurs de gérer uniquement leurs propres conversations
    
  3. Index pour les performances
    - Index sur user_id pour récupération rapide
    - Index sur session_id pour récupération de session complète
    - Index sur created_at pour tri chronologique
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des conversations IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id text NOT NULL, -- Text au lieu de UUID pour accepter les IDs générés côté client (welcome-xxx, user-xxx, etc.)
  message_type text NOT NULL CHECK (message_type IN ('user', 'ai', 'error', 'code')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policies pour la table ai_conversations
CREATE POLICY "ai_conversations_select" ON public.ai_conversations
  FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "ai_conversations_insert" ON public.ai_conversations
  FOR INSERT TO public
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_conversations_update" ON public.ai_conversations
  FOR UPDATE TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_conversations_delete" ON public.ai_conversations
  FOR DELETE TO public
  USING (user_id = auth.uid());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON public.ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON public.ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_session ON public.ai_conversations(user_id, session_id, created_at DESC);

-- Commentaire sur la table
COMMENT ON TABLE public.ai_conversations IS 'Stockage des conversations avec l''assistant IA de Centrinote';
COMMENT ON COLUMN public.ai_conversations.session_id IS 'Identifiant unique de session de conversation (persiste entre les navigations)';
COMMENT ON COLUMN public.ai_conversations.message_id IS 'Identifiant unique de chaque message (pour référence frontend)';

