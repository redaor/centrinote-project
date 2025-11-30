-- =====================================================
-- Index pour chat_memory : Optimiser la recherche par user_id
-- =====================================================

-- Index simple sur user_id pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_id 
ON chat_memory(user_id);

-- Index composite pour charger rapidement la dernière mémoire d'un utilisateur
CREATE INDEX IF NOT EXISTS idx_chat_memory_user_updated 
ON chat_memory(user_id, updated_at DESC);

-- Commentaires
COMMENT ON INDEX idx_chat_memory_user_id IS 'Index simple sur user_id pour optimiser les requêtes par utilisateur';
COMMENT ON INDEX idx_chat_memory_user_updated IS 'Index composite pour charger rapidement la dernière mémoire persistante d''un utilisateur (peu importe la session)';

