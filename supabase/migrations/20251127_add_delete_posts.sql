-- ============================================
-- Ajout de la colonne reply_count
-- ============================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0;

-- ============================================
-- Fonction pour incrémenter reply_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_reply_count(target_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE forum_posts
  SET reply_count = reply_count + 1
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Fonction pour décrémenter reply_count
-- ============================================
CREATE OR REPLACE FUNCTION decrement_reply_count(target_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE forum_posts
  SET reply_count = GREATEST(0, reply_count - 1)
  WHERE id = target_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger pour incrémenter automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION auto_increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM increment_reply_count(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_reply_count ON forum_replies;
CREATE TRIGGER trigger_increment_reply_count
  AFTER INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_reply_count();

-- ============================================
-- Trigger pour décrémenter automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION auto_decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM decrement_reply_count(OLD.post_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_decrement_reply_count ON forum_replies;
CREATE TRIGGER trigger_decrement_reply_count
  AFTER DELETE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION auto_decrement_reply_count();

-- ============================================
-- Initialiser reply_count pour posts existants
-- ============================================
UPDATE forum_posts
SET reply_count = (
  SELECT COUNT(*)
  FROM forum_replies
  WHERE forum_replies.post_id = forum_posts.id
    AND forum_replies.hidden = false
)
WHERE reply_count = 0;

-- ============================================
-- RLS DELETE pour forum_posts
-- ============================================

-- Policy 1 : Auteur peut supprimer si reply_count = 0
DROP POLICY IF EXISTS "Authors can delete own posts without replies" ON forum_posts;
CREATE POLICY "Authors can delete own posts without replies"
  ON forum_posts FOR DELETE
  USING (
    auth.uid() = user_id
    AND reply_count = 0
  );

-- Policy 2 : Admins peuvent tout supprimer
DROP POLICY IF EXISTS "Admins can delete any post" ON forum_posts;
CREATE POLICY "Admins can delete any post"
  ON forum_posts FOR DELETE
  USING (
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

-- ============================================
-- RLS DELETE pour forum_replies
-- ============================================

-- Policy 1 : Auteur peut supprimer sa propre réponse
DROP POLICY IF EXISTS "Authors can delete own replies" ON forum_replies;
CREATE POLICY "Authors can delete own replies"
  ON forum_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 2 : Admins peuvent supprimer n'importe quelle réponse
DROP POLICY IF EXISTS "Admins can delete any reply" ON forum_replies;
CREATE POLICY "Admins can delete any reply"
  ON forum_replies FOR DELETE
  USING (
    auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr')
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN forum_posts.reply_count IS 'Nombre de réponses (auto-incrémenté via trigger)';
COMMENT ON FUNCTION increment_reply_count IS 'Incrémente le compteur de réponses d''un post';
COMMENT ON FUNCTION decrement_reply_count IS 'Décrémente le compteur de réponses d''un post';
