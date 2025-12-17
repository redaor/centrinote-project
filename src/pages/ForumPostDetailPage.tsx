import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Flag, Loader, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../components/AuthProvider';
import { forumService } from '../services/forumService';
import { getUserBadges } from '../types/forum';
import { UserBadge } from '../components/forum/UserBadge';
import { ReplyForm } from '../components/forum/ReplyForm';
import { ReplyCard } from '../components/forum/ReplyCard';
import type { ForumPost, ForumReply } from '../types/forum';

export function ForumPostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useApp();
  const { darkMode } = state;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await forumService.getPost(id, user?.id);
      if (data) {
        setPost(data);
        setIsLiked(data.user_has_liked || false);
        setLikesCount(data.likes_count);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  const loadReplies = useCallback(async () => {
    if (!id) return;

    try {
      const data = await forumService.getReplies(id, user?.id);
      setReplies(data);
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (id) {
      loadPost();
      loadReplies();
    }
  }, [id, user?.id, loadPost, loadReplies]);

  const handleLike = async () => {
    if (!user || !post || isLiking) return;

    setIsLiking(true);

    try {
      if (isLiked) {
        await forumService.unlikePost(post.id, user.id);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await forumService.likePost(post.id, user.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReport = async () => {
    if (!user || !post) return;

    const reason = window.prompt('Pourquoi signaler ce post ? (optionnel)');
    if (reason === null) return;

    try {
      await forumService.reportPost(post.id, user.id, reason);
      alert('Merci ! Le post a été signalé.');
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Erreur lors du signalement');
    }
  };

  const handleReplySubmit = async (body: string) => {
    if (!user || !post) {
      navigate('/auth');
      return;
    }

    await forumService.createReply(user.id, post.id, body);
    await loadReplies();
  };

  const handleAcceptAnswer = async (replyId: string) => {
    if (!user || !post) return;

    try {
      await forumService.acceptAnswer(post.id, replyId, user.id);
      await loadPost();
    } catch (error) {
      console.error('Error accepting answer:', error);
      alert('Erreur lors de l\'acceptation de la réponse');
    }
  };

  const handleDeletePost = async () => {
    if (!user || !post) return;

    if (!confirm('Supprimer ce post définitivement ?')) return;

    try {
      await forumService.deletePost(post.id);
      navigate('/forum'); // Rediriger vers la liste après suppression
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Post introuvable
          </p>
          <button
            onClick={() => navigate('/forum')}
            className="mt-4 text-purple-500 hover:text-purple-600"
          >
            Retour au forum
          </button>
        </div>
      </div>
    );
  }

  const isPostAuthor = user?.id === post.user_id;

  // Vérifier si l'utilisateur est admin
  const isAdmin =
    user?.email === 'contact@centrinote.fr' ||
    user?.email === 'reda_sahraoui@outlook.fr';

  // Vérifier si l'utilisateur peut supprimer ce post
  const canDelete = user && post && (
    (user.id === post.user_id && post.reply_count === 0) || // Auteur + pas de réponses
    isAdmin // Admin
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/forum')}
          className={`flex items-center space-x-2 mb-6 ${
            darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          } transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour au forum</span>
        </button>

        {/* Post */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 mb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                {post.user?.name?.charAt(0).toUpperCase() || '?'}
              </div>

              {/* User info */}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {post.user?.name || 'Utilisateur'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(post.created_at)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleReport}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Signaler"
            >
              <Flag className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {post.title}
            {post.accepted_answer_id && (
              <span className="ml-3 inline-flex items-center text-green-600 dark:text-green-400">
                <Check className="w-6 h-6" />
                <span className="ml-1 text-sm">Résolu</span>
              </span>
            )}
          </h1>

          {/* Body */}
          <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap text-lg">
            {post.body}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLike}
              disabled={isLiking || !user}
              className={`flex items-center space-x-2 transition-colors ${
                isLiked
                  ? 'text-red-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
              } ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{likesCount}</span>
            </button>

            {/* Delete button */}
            {canDelete && (
              <button
                onClick={handleDeletePost}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Replies section */}
        <div className="space-y-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            💬 Réponses ({replies.length})
          </h2>

          {/* Reply form */}
          {user ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ✍️ Ta réponse
              </h3>
              <ReplyForm onSubmit={handleReplySubmit} />
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
              <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Tu dois être connecté pour répondre
              </p>
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors"
              >
                Se connecter
              </button>
            </div>
          )}

          {/* Replies list */}
          {replies.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>Aucune réponse pour l'instant. Sois le premier à répondre !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  userId={user?.id}
                  userEmail={user?.email}
                  isPostAuthor={isPostAuthor}
                  isAccepted={post.accepted_answer_id === reply.id}
                  onAccept={() => handleAcceptAnswer(reply.id)}
                  onLikeToggle={loadReplies}
                  onReport={loadReplies}
                  onDelete={() => {
                    loadReplies();
                    loadPost(); // Recharger aussi le post pour mettre à jour reply_count
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
