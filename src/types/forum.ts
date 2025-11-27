export interface ForumPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  likes_count: number;
  reports_count: number;
  hidden: boolean;
  accepted_answer_id: string | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    email: string;
    name: string;
  };
  replies?: ForumReply[];
  user_has_liked?: boolean;
  replies_count?: number;
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  likes_count: number;
  reports_count: number;
  hidden: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    email: string;
    name: string;
  };
  user_has_liked?: boolean;
}

export interface ForumLike {
  id: string;
  user_id: string;
  post_id?: string;
  reply_id?: string;
  created_at: string;
}

export interface ForumReport {
  id: string;
  user_id: string;
  post_id?: string;
  reply_id?: string;
  reason?: string;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  email: string;
  name: string;
  posts_count: number;
  replies_count: number;
  total_likes: number;
  accepted_answers_count: number;
}

export type UserBadge = '🆕 Nouveau' | '💡 Utile' | '✅ Solution';

export function getUserBadges(stats: UserStats): UserBadge[] {
  const badges: UserBadge[] = [];

  if (stats.posts_count + stats.replies_count >= 1) {
    badges.push('🆕 Nouveau');
  }

  if (stats.total_likes >= 10) {
    badges.push('💡 Utile');
  }

  if (stats.accepted_answers_count >= 1) {
    badges.push('✅ Solution');
  }

  return badges;
}
