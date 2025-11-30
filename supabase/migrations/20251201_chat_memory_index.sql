-- =====================================================
-- Index pour chat_memory : Optimiser la recherche par user_id
-- =====================================================

-- Index composite pour charger rapidement la dernière mémoire d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_updated 
ON chat_memory(user_id, updated_at DESC);

-- Commentaire
COMMENT ON INDEX idx_chat_memory_user_updated IS 'Index pour charger rapidement la dernière mémoire persistante d''un utilisateur (peu importe la session)';

