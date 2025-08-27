-- 🔐 Schéma complet table zoom_tokens avec RLS
-- ================================================

-- 1. Créer la table zoom_tokens (idempotent)
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

-- 3. Fonction de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger pour updated_at
DROP TRIGGER IF EXISTS update_zoom_tokens_updated_at ON public.zoom_tokens;
CREATE TRIGGER update_zoom_tokens_updated_at
    BEFORE UPDATE ON public.zoom_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS - Activer Row Level Security
ALTER TABLE public.zoom_tokens ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "zoom_tokens_select_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_insert_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_update_own" ON public.zoom_tokens;
DROP POLICY IF EXISTS "zoom_tokens_delete_own" ON public.zoom_tokens;

-- 7. Créer les nouvelles politiques RLS
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

-- 8. Politiques pour les rôles service (n8n/backend)
-- Permettre à service_role d'accéder à tous les enregistrements
CREATE POLICY "zoom_tokens_service_role_all" 
ON public.zoom_tokens 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- 9. Fonction utilitaire pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION clean_expired_zoom_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.zoom_tokens 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO public.cleanup_logs (table_name, deleted_count, cleaned_at)
    VALUES ('zoom_tokens', deleted_count, NOW())
    ON CONFLICT DO NOTHING;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Table pour logs de nettoyage (optionnel)
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    deleted_count INTEGER NOT NULL,
    cleaned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Commentaires pour documentation
COMMENT ON TABLE public.zoom_tokens IS 'Table des tokens OAuth Zoom par utilisateur';
COMMENT ON COLUMN public.zoom_tokens.user_id IS 'Référence vers auth.users(id)';
COMMENT ON COLUMN public.zoom_tokens.access_token IS 'Token d''accès Zoom OAuth (chiffré côté app si nécessaire)';
COMMENT ON COLUMN public.zoom_tokens.refresh_token IS 'Token de refresh Zoom OAuth';
COMMENT ON COLUMN public.zoom_tokens.expires_at IS 'Date d''expiration du access_token';
COMMENT ON COLUMN public.zoom_tokens.scope IS 'Portée des permissions accordées';

-- 12. Vues utilitaires pour monitoring (optionnel)
CREATE OR REPLACE VIEW public.zoom_tokens_status AS
SELECT 
    COUNT(*) as total_tokens,
    COUNT(*) FILTER (WHERE expires_at > NOW()) as valid_tokens,
    COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_tokens,
    MIN(created_at) as oldest_token,
    MAX(created_at) as newest_token
FROM public.zoom_tokens;

-- Accès en lecture pour authenticated users sur la vue de statut
GRANT SELECT ON public.zoom_tokens_status TO authenticated;

-- 13. Fonction pour vérifier si un utilisateur a un token valide
CREATE OR REPLACE FUNCTION user_has_valid_zoom_token(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.zoom_tokens 
        WHERE user_id = check_user_id 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permettre aux utilisateurs connectés d'utiliser cette fonction
GRANT EXECUTE ON FUNCTION user_has_valid_zoom_token(UUID) TO authenticated;

-- 14. Commandes de vérification (à exécuter pour tester)
/*
-- Test des RLS (à exécuter en tant qu'utilisateur connecté)
SELECT * FROM public.zoom_tokens; -- Ne doit montrer que les tokens de l'utilisateur connecté

-- Test de la fonction de vérification
SELECT user_has_valid_zoom_token(); -- TRUE/FALSE selon l'état du token

-- Nettoyer les tokens expirés
SELECT clean_expired_zoom_tokens(); -- Retourne le nombre de tokens supprimés

-- Voir le statut global (admin seulement)
SELECT * FROM public.zoom_tokens_status;
*/