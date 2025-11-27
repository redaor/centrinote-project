import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Flag, Check } from 'lucide-react';
import type { ForumPost } from '../../types/forum';
import { getUserBadges } from '../../types/forum';
import { UserBadge } from './UserBadge';
import { forumService } from '../../services/forumService';

interface PostCardProps {
  post: ForumPost;
  userId?: string;
  userStats?: any;
  onLikeToggle?: () => void;
  onReport?: () => void;
}

export function PostCard({ post, userId, userStats, onLikeToggle, onReport }: PostCardProps) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const badges = userStats ? getUserBadges(userStats) : [];

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) {
      navigate('/auth');
      return;
    }

    if (isLiking) return;

    setIsLiking(true);

    try {
      if (isLiked) {
        await forumService.unlikePost(post.id, userId);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await forumService.likePost(post.id, userId);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }

      onLikeToggle?.();
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) {
      navigate('/auth');
      return;
    }

    const reason = window.prompt('Pourquoi signaler ce post ? (optionnel)');
    if (reason === null) return; // Utilisateur a annulé

    try {
      await forumService.reportPost(post.id, userId, reason);
      alert('Merci ! Le post a été signalé.');
      onReport?.();
    } catch (error) {
      console.error('Error reporting post:', error);
      alert('Erreur lors du signalement');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;

    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(date);
  };

  return (
    <div
      onClick={() => navigate(`/forum/${post.id}`)}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
            {post.user?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          {/* User info */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {post.user?.name || 'Utilisateur'}
              </span>
              {badges.map((badge) => (
                <UserBadge key={badge} badge={badge} />
              ))}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(post.created_at)}
            </span>
          </div>
        </div>

        {/* Report button */}
        <button
          onClick={handleReport}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Signaler"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {post.title}
        {post.accepted_answer_id && (
          <span className="ml-2 inline-flex items-center text-green-600 dark:text-green-400">
            <Check className="w-5 h-5" />
          </span>
        )}
      </h3>

      {/* Body preview */}
      <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
        {post.body}
      </p>

      {/* Footer */}
      <div className="flex items-center space-x-4 text-sm">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center space-x-1 transition-colors ${
            isLiked
              ? 'text-red-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likesCount}</span>
        </button>

        {/* Replies count */}
        <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-5 h-5" />
          <span>{post.replies_count || 0}</span>
        </div>
      </div>
    </div>
  );
}
