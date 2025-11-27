import React, { useState } from 'react';
import { Heart, Flag, Check } from 'lucide-react';
import type { ForumReply } from '../../types/forum';
import { getUserBadges } from '../../types/forum';
import { UserBadge } from './UserBadge';
import { forumService } from '../../services/forumService';

interface ReplyCardProps {
  reply: ForumReply;
  userId?: string;
  isPostAuthor: boolean;
  isAccepted: boolean;
  userStats?: any;
  onAccept?: () => void;
  onLikeToggle?: () => void;
  onReport?: () => void;
}

export function ReplyCard({
  reply,
  userId,
  isPostAuthor,
  isAccepted,
  userStats,
  onAccept,
  onLikeToggle,
  onReport,
}: ReplyCardProps) {
  const [isLiked, setIsLiked] = useState(reply.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(reply.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const badges = userStats ? getUserBadges(userStats) : [];

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId || isLiking) return;

    setIsLiking(true);

    try {
      if (isLiked) {
        await forumService.unlikeReply(reply.id, userId);
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        await forumService.likeReply(reply.id, userId);
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

    if (!userId) return;

    const reason = window.prompt('Pourquoi signaler cette réponse ? (optionnel)');
    if (reason === null) return;

    try {
      await forumService.reportReply(reply.id, userId, reason);
      alert('Merci ! La réponse a été signalée.');
      onReport?.();
    } catch (error) {
      console.error('Error reporting reply:', error);
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
      className={`bg-white dark:bg-gray-800 border rounded-lg p-6 ${
        isAccepted
          ? 'border-green-500 dark:border-green-600 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-semibold">
            {reply.user?.name?.charAt(0).toUpperCase() || '?'}
          </div>

          {/* User info */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {reply.user?.name || 'Utilisateur'}
              </span>
              {badges.map((badge) => (
                <UserBadge key={badge} badge={badge} />
              ))}
              {isAccepted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  ✅ Réponse acceptée
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(reply.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Accept button (visible only for post author) */}
          {isPostAuthor && !isAccepted && (
            <button
              onClick={onAccept}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              title="Marquer comme réponse acceptée"
            >
              <Check className="w-4 h-4" />
              <span>Accepter</span>
            </button>
          )}

          {/* Report button */}
          <button
            onClick={handleReport}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Signaler"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">
        {reply.body}
      </p>

      {/* Footer */}
      <div className="flex items-center space-x-4 text-sm">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={isLiking || !userId}
          className={`flex items-center space-x-1 transition-colors ${
            isLiked
              ? 'text-red-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
          } ${!userId ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likesCount}</span>
        </button>
      </div>
    </div>
  );
}
