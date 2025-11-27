import React from 'react';
import type { UserBadge as UserBadgeType } from '../../types/forum';

interface UserBadgeProps {
  badge: UserBadgeType;
}

export function UserBadge({ badge }: UserBadgeProps) {
  const getBadgeStyles = () => {
    switch (badge) {
      case '🆕 Nouveau':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case '💡 Utile':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case '✅ Solution':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeStyles()}`}
    >
      {badge}
    </span>
  );
}
