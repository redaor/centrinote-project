-- ============================================
-- TABLE FORUM_POSTS : Posts principaux
-- ============================================
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false,
  accepted_answer_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_hidden ON forum_posts(hidden);

-- ============================================
-- TABLE FORUM_REPLIES : Réponses aux posts
-- ============================================
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at DESC);

-- ============================================
-- TABLE FORUM_LIKES : Likes sur posts et réponses
-- ============================================
CREATE TABLE IF NOT EXISTS forum_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte : un like soit sur un post, soit sur une réponse
  CONSTRAINT like_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),

  -- Contrainte : un utilisateur ne peut liker qu'une fois le même contenu
  CONSTRAINT unique_like UNIQUE(user_id, post_id, reply_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_forum_likes_user_id ON forum_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_post_id ON forum_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_likes_reply_id ON forum_likes(reply_id);

-- ============================================
-- TABLE FORUM_REPORTS : Signalements
-- ============================================
CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte : un signalement soit sur un post, soit sur une réponse
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),

  -- Contrainte : un utilisateur ne peut signaler qu'une fois le même contenu
  CONSTRAINT unique_report UNIQUE(user_id, post_id, reply_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_forum_reports_post_id ON forum_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_reply_id ON forum_reports(reply_id);

-- ============================================
-- FUNCTIONS : Triggers pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_forum_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_forum_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER trigger_update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_posts_updated_at();

DROP TRIGGER IF EXISTS trigger_update_forum_replies_updated_at ON forum_replies;
CREATE TRIGGER trigger_update_forum_replies_updated_at
  BEFORE UPDATE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_replies_updated_at();

-- ============================================
-- FUNCTIONS : Auto-hide si >= 3 signalements
-- ============================================
CREATE OR REPLACE FUNCTION check_post_reports()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    UPDATE forum_posts
    SET hidden = true
    WHERE id = NEW.post_id
      AND (SELECT COUNT(*) FROM forum_reports WHERE post_id = NEW.post_id) >= 3;
  END IF;

  IF NEW.reply_id IS NOT NULL THEN
    UPDATE forum_replies
    SET hidden = true
    WHERE id = NEW.reply_id
      AND (SELECT COUNT(*) FROM forum_reports WHERE reply_id = NEW.reply_id) >= 3;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_reports ON forum_reports;
CREATE TRIGGER trigger_check_reports
  AFTER INSERT ON forum_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_post_reports();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Forum Posts
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden posts"
  ON forum_posts FOR SELECT
  USING (hidden = false OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
  ON forum_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authors can update their own posts"
  ON forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their own posts"
  ON forum_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Forum Replies
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden replies"
  ON forum_replies FOR SELECT
  USING (hidden = false OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create replies"
  ON forum_replies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authors can update their own replies"
  ON forum_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete their own replies"
  ON forum_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Forum Likes
ALTER TABLE forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON forum_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON forum_likes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON forum_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Forum Reports
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view reports"
  ON forum_reports FOR SELECT
  USING (auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr'));

CREATE POLICY "Authenticated users can report"
  ON forum_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ============================================
-- VIEW : User stats for badges
-- ============================================
CREATE OR REPLACE VIEW forum_user_stats AS
SELECT
  u.id as user_id,
  u.email,
  u.raw_user_meta_data->>'name' as name,
  COUNT(DISTINCT p.id) as posts_count,
  COUNT(DISTINCT r.id) as replies_count,
  COALESCE(SUM(p.likes_count), 0) + COALESCE(SUM(r.likes_count), 0) as total_likes,
  COUNT(DISTINCT CASE WHEN p.accepted_answer_id IS NOT NULL THEN p.id END) as accepted_answers_count
FROM auth.users u
LEFT JOIN forum_posts p ON p.user_id = u.id
LEFT JOIN forum_replies r ON r.user_id = u.id
GROUP BY u.id, u.email, u.raw_user_meta_data->>'name';

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE forum_posts IS 'Posts principaux du forum communautaire';
COMMENT ON TABLE forum_replies IS 'Réponses aux posts du forum';
COMMENT ON TABLE forum_likes IS 'Likes sur posts et réponses';
COMMENT ON TABLE forum_reports IS 'Signalements de contenu inapproprié';
COMMENT ON VIEW forum_user_stats IS 'Statistiques utilisateur pour badges';
