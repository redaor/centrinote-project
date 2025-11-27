import { supabase } from '../lib/supabase';
import type { ForumPost, ForumReply, UserStats } from '../types/forum';

export const forumService = {
  // ============================================
  // POSTS
  // ============================================

  /**
   * Récupérer tous les posts du forum (non masqués)
   */
  async getPosts(userId?: string): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('hidden', false)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }

    // Enrichir avec les stats
    const enrichedPosts = await Promise.all(
      (data || []).map(async (post) => {
        const repliesCount = await this.getRepliesCount(post.id);
        const userHasLiked = userId
          ? await this.hasUserLikedPost(post.id, userId)
          : false;

        return {
          ...post,
          user: {
            id: post.user?.id || '',
            email: post.user?.email || '',
            name: post.user?.raw_user_meta_data?.name || 'Utilisateur',
          },
          replies_count: repliesCount,
          user_has_liked: userHasLiked,
        };
      })
    );

    return enrichedPosts;
  },

  /**
   * Récupérer un post par son ID
   */
  async getPost(postId: string, userId?: string): Promise<ForumPost | null> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return null;
    }

    const userHasLiked = userId
      ? await this.hasUserLikedPost(postId, userId)
      : false;

    return {
      ...data,
      user: {
        id: data.user?.id || '',
        email: data.user?.email || '',
        name: data.user?.raw_user_meta_data?.name || 'Utilisateur',
      },
      user_has_liked: userHasLiked,
    };
  },

  /**
   * Créer un nouveau post
   */
  async createPost(
    userId: string,
    title: string,
    body: string
  ): Promise<ForumPost> {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title,
        body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      throw error;
    }

    return data;
  },

  /**
   * Nombre de réponses d'un post
   */
  async getRepliesCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('forum_replies')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('hidden', false);

    if (error) {
      console.error('Error counting replies:', error);
      return 0;
    }

    return count || 0;
  },

  // ============================================
  // REPLIES
  // ============================================

  /**
   * Récupérer les réponses d'un post
   */
  async getReplies(postId: string, userId?: string): Promise<ForumReply[]> {
    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('post_id', postId)
      .eq('hidden', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      throw error;
    }

    // Enrichir avec user_has_liked
    const enrichedReplies = await Promise.all(
      (data || []).map(async (reply) => {
        const userHasLiked = userId
          ? await this.hasUserLikedReply(reply.id, userId)
          : false;

        return {
          ...reply,
          user: {
            id: reply.user?.id || '',
            email: reply.user?.email || '',
            name: reply.user?.raw_user_meta_data?.name || 'Utilisateur',
          },
          user_has_liked: userHasLiked,
        };
      })
    );

    return enrichedReplies;
  },

  /**
   * Créer une réponse
   */
  async createReply(
    userId: string,
    postId: string,
    body: string
  ): Promise<ForumReply> {
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        user_id: userId,
        post_id: postId,
        body,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      throw error;
    }

    return data;
  },

  // ============================================
  // LIKES
  // ============================================

  /**
   * Vérifier si l'utilisateur a liké un post
   */
  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking like:', error);
      return false;
    }

    return data !== null;
  },

  /**
   * Vérifier si l'utilisateur a liké une réponse
   */
  async hasUserLikedReply(replyId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('forum_likes')
      .select('id')
      .eq('reply_id', replyId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking like:', error);
      return false;
    }

    return data !== null;
  },

  /**
   * Liker un post
   */
  async likePost(postId: string, userId: string): Promise<void> {
    // Insérer le like
    const { error: likeError } = await supabase.from('forum_likes').insert({
      user_id: userId,
      post_id: postId,
    });

    if (likeError) {
      console.error('Error liking post:', likeError);
      throw likeError;
    }

    // Incrémenter le compteur
    const { error: updateError } = await supabase.rpc('increment', {
      table_name: 'forum_posts',
      row_id: postId,
      column_name: 'likes_count',
    });

    if (updateError) {
      // Fallback manuel si RPC n'existe pas
      const { data: post } = await supabase
        .from('forum_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (post) {
        await supabase
          .from('forum_posts')
          .update({ likes_count: post.likes_count + 1 })
          .eq('id', postId);
      }
    }
  },

  /**
   * Unliker un post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    // Supprimer le like
    const { error: deleteError } = await supabase
      .from('forum_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error unliking post:', deleteError);
      throw deleteError;
    }

    // Décrémenter le compteur
    const { data: post } = await supabase
      .from('forum_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    if (post && post.likes_count > 0) {
      await supabase
        .from('forum_posts')
        .update({ likes_count: Math.max(0, post.likes_count - 1) })
        .eq('id', postId);
    }
  },

  /**
   * Liker une réponse
   */
  async likeReply(replyId: string, userId: string): Promise<void> {
    // Insérer le like
    const { error: likeError } = await supabase.from('forum_likes').insert({
      user_id: userId,
      reply_id: replyId,
    });

    if (likeError) {
      console.error('Error liking reply:', likeError);
      throw likeError;
    }

    // Incrémenter le compteur
    const { data: reply } = await supabase
      .from('forum_replies')
      .select('likes_count')
      .eq('id', replyId)
      .single();

    if (reply) {
      await supabase
        .from('forum_replies')
        .update({ likes_count: reply.likes_count + 1 })
        .eq('id', replyId);
    }
  },

  /**
   * Unliker une réponse
   */
  async unlikeReply(replyId: string, userId: string): Promise<void> {
    // Supprimer le like
    const { error: deleteError } = await supabase
      .from('forum_likes')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error unliking reply:', deleteError);
      throw deleteError;
    }

    // Décrémenter le compteur
    const { data: reply } = await supabase
      .from('forum_replies')
      .select('likes_count')
      .eq('id', replyId)
      .single();

    if (reply && reply.likes_count > 0) {
      await supabase
        .from('forum_replies')
        .update({ likes_count: Math.max(0, reply.likes_count - 1) })
        .eq('id', replyId);
    }
  },

  // ============================================
  // ACCEPTED ANSWER
  // ============================================

  /**
   * Marquer une réponse comme acceptée
   */
  async acceptAnswer(postId: string, replyId: string, userId: string): Promise<void> {
    // Vérifier que l'utilisateur est l'auteur du post
    const { data: post } = await supabase
      .from('forum_posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== userId) {
      throw new Error('Seul l\'auteur du post peut accepter une réponse');
    }

    const { error } = await supabase
      .from('forum_posts')
      .update({ accepted_answer_id: replyId })
      .eq('id', postId);

    if (error) {
      console.error('Error accepting answer:', error);
      throw error;
    }
  },

  // ============================================
  // REPORTS
  // ============================================

  /**
   * Signaler un post
   */
  async reportPost(postId: string, userId: string, reason?: string): Promise<void> {
    const { error } = await supabase.from('forum_reports').insert({
      user_id: userId,
      post_id: postId,
      reason,
    });

    if (error) {
      console.error('Error reporting post:', error);
      throw error;
    }

    // Incrémenter le compteur
    const { data: post } = await supabase
      .from('forum_posts')
      .select('reports_count')
      .eq('id', postId)
      .single();

    if (post) {
      await supabase
        .from('forum_posts')
        .update({ reports_count: post.reports_count + 1 })
        .eq('id', postId);
    }
  },

  /**
   * Signaler une réponse
   */
  async reportReply(replyId: string, userId: string, reason?: string): Promise<void> {
    const { error } = await supabase.from('forum_reports').insert({
      user_id: userId,
      reply_id: replyId,
      reason,
    });

    if (error) {
      console.error('Error reporting reply:', error);
      throw error;
    }

    // Incrémenter le compteur
    const { data: reply } = await supabase
      .from('forum_replies')
      .select('reports_count')
      .eq('id', replyId)
      .single();

    if (reply) {
      await supabase
        .from('forum_replies')
        .update({ reports_count: reply.reports_count + 1 })
        .eq('id', replyId);
    }
  },

  // ============================================
  // USER STATS
  // ============================================

  /**
   * Récupérer les stats d'un utilisateur
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await supabase
      .from('forum_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  },
};
