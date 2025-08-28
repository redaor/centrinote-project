-- Migration: Ajouter RLS et politiques pour zoom_tokens
-- Créé le 2025-08-28 pour corriger les erreurs PostgREST 406/401

-- 1. S'assurer que la table zoom_tokens existe
CREATE TABLE IF NOT EXISTS public.zoom_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT DEFAULT 'meeting:write meeting:read user:read',
    token_type TEXT DEFAULT 'bearer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index unique sur user_id (un token par utilisateur)
    CONSTRAINT zoom_tokens_user_id_unique UNIQUE (user_id)
);

-- 2. Index pour performances
CREATE INDEX IF NOT EXISTS zoom_tokens_user_id_idx ON public.zoom_tokens (user_id);
CREATE INDEX IF NOT EXISTS zoom_tokens_expires_at_idx ON public.zoom_tokens (expires_at);

-- 3. Activer Row Level Security
ALTER TABLE public.zoom_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "read own zoom tokens" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_select_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_insert_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_update_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_delete_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_service_role_all" ON public.zoom_tokens;

-- 5. Créer les politiques RLS pour les utilisateurs authentifiés
CREATE POLICY "zoom_tokens_select_own" 
ON public.zoom_tokens 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "zoom_tokens_insert_own" 
ON public.zoom_tokens 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "zoom_tokens_update_own" 
ON public.zoom_tokens 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "zoom_tokens_delete_own" 
ON public.zoom_tokens 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 6. Politique pour service_role (N8N, Edge Functions)
CREATE POLICY "zoom_tokens_service_role_all" 
ON public.zoom_tokens 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- 7. Trigger updated_at (si la fonction existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_zoom_tokens_updated_at ON public.zoom_tokens;
CREATE TRIGGER update_zoom_tokens_updated_at
    BEFORE UPDATE ON public.zoom_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();