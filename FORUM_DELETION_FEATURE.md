# Forum Deletion Feature - Implementation Complete ✅

## Overview
Implemented complete post and reply deletion functionality with proper permissions and auto-incrementing reply counts.

## Deletion Rules

### Posts
- **Author can delete**: Only if `reply_count = 0` (no replies)
- **Admin can delete**: Any post, regardless of reply count
- **Hard delete**: Permanently removes from database (no soft-delete)

### Replies
- **Author can delete**: Their own replies
- **Admin can delete**: Any reply
- **Auto-decrement**: Deleting a reply decrements parent post's `reply_count`

### Admin Emails
- `contact@centrinote.fr`
- `reda_sahraoui@outlook.fr`

## Files Modified

### 1. Database Migration
**File**: `supabase/migrations/20251127_add_delete_posts.sql`

**Changes**:
- Added `reply_count INT DEFAULT 0` column to `forum_posts`
- Created `increment_reply_count()` function
- Created `decrement_reply_count()` function
- Created `auto_increment_reply_count()` trigger on `forum_replies` INSERT
- Created `auto_decrement_reply_count()` trigger on `forum_replies` DELETE
- Added RLS policy: "Authors can delete own posts without replies"
- Added RLS policy: "Admins can delete any post"
- Added RLS policy: "Authors can delete own replies"
- Added RLS policy: "Admins can delete any reply"
- Initialized `reply_count` for existing posts

**To Apply**:
```bash
supabase db push
# OR apply via Supabase Dashboard SQL Editor
```

### 2. TypeScript Types
**File**: `src/types/forum.ts`

**Changes**:
- Added `reply_count: number` to `ForumPost` interface

### 3. Forum Service
**File**: `src/services/forumService.ts`

**Changes**:
- Added `deletePost(postId: string): Promise<void>` method
- Added `deleteReply(replyId: string): Promise<void>` method
- Updated `createReply()` with comment about auto-increment trigger

### 4. Post Card Component
**File**: `src/components/forum/PostCard.tsx`

**Changes**:
- Added `userEmail?: string` prop
- Added `onDelete?: () => void` prop
- Added `isAdmin` check based on email
- Added `canDelete` logic (author with reply_count=0 OR admin)
- Added `handleDelete()` async function with confirm dialog
- Added "Supprimer" button in footer (text-xs, red styling)

### 5. Reply Card Component
**File**: `src/components/forum/ReplyCard.tsx`

**Changes**:
- Added `userEmail?: string` prop
- Added `onDelete?: () => void` prop
- Added `isAdmin` check based on email
- Added `canDelete` logic (author OR admin)
- Added `handleDelete()` async function with confirm dialog
- Added "Supprimer" button in footer (text-xs, red styling)

### 6. Forum List Page
**File**: `src/pages/ForumPage.tsx`

**Changes**:
- Passed `userEmail={user?.email}` to `PostCard`
- Passed `onDelete={loadPosts}` to `PostCard` (refreshes list after deletion)

### 7. Forum Post Detail Page
**File**: `src/pages/ForumPostDetailPage.tsx`

**Changes**:
- Added `handleDeletePost()` async function (redirects to `/forum` after deletion)
- Added `isAdmin` check based on user email
- Added `canDelete` logic for main post (author with reply_count=0 OR admin)
- Added "Supprimer" button in main post footer (text-xs, red styling)
- Updated footer layout from `flex items-center space-x-4` to `justify-between`
- Passed `userEmail={user?.email}` to all `ReplyCard` components
- Updated `onDelete` callback for replies to reload both replies AND post (to update reply_count)

## User Experience

### Deletion Flow
1. User sees "Supprimer" button only if they have permission
2. Clicks button
3. Native confirm dialog: "Supprimer ce post/cette réponse définitivement ?"
4. If confirmed:
   - Post: Redirects to `/forum` list
   - Reply: Stays on page, refreshes replies and post data
5. If error: Shows alert with error message

### Visual Design
- Button text: "Supprimer"
- Styling: `text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300`
- Small, unobtrusive red text
- Hover effect for better UX
- Dark mode support

## Testing Checklist

### Posts
- [ ] Author can delete own post with 0 replies
- [ ] Author CANNOT delete own post with replies (button hidden)
- [ ] Admin can delete any post (with or without replies)
- [ ] Non-author, non-admin cannot see delete button
- [ ] Deleting post redirects to `/forum`
- [ ] Deleted post no longer appears in list

### Replies
- [ ] Author can delete own reply
- [ ] Admin can delete any reply
- [ ] Non-author, non-admin cannot see delete button
- [ ] Deleting reply updates parent post's `reply_count`
- [ ] Deleting reply refreshes the page properly
- [ ] After deleting last reply, author can now delete the parent post

### Auto-Increment
- [ ] Creating reply increments parent post's `reply_count`
- [ ] Deleting reply decrements parent post's `reply_count`
- [ ] `reply_count` never goes below 0
- [ ] `reply_count` matches actual reply count

## Database Schema

### forum_posts
```sql
CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  reports_count INT DEFAULT 0,
  reply_count INT DEFAULT 0, -- ✅ NEW
  accepted_answer_id UUID REFERENCES forum_replies(id),
  hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Triggers
```sql
-- Auto-increment on reply creation
CREATE TRIGGER trigger_increment_reply_count
  AFTER INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION auto_increment_reply_count();

-- Auto-decrement on reply deletion
CREATE TRIGGER trigger_decrement_reply_count
  AFTER DELETE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION auto_decrement_reply_count();
```

### RLS Policies
```sql
-- Posts
CREATE POLICY "Authors can delete own posts without replies"
  ON forum_posts FOR DELETE
  USING (auth.uid() = user_id AND reply_count = 0);

CREATE POLICY "Admins can delete any post"
  ON forum_posts FOR DELETE
  USING (auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr'));

-- Replies
CREATE POLICY "Authors can delete own replies"
  ON forum_replies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any reply"
  ON forum_replies FOR DELETE
  USING (auth.jwt() ->> 'email' IN ('contact@centrinote.fr', 'reda_sahraoui@outlook.fr'));
```

## Security

✅ **Database-level security**: RLS policies enforce deletion rules at the database level
✅ **Service-level validation**: forumService methods handle deletion logic
✅ **UI-level permissions**: Components check permissions before showing buttons
✅ **Admin verification**: Email-based admin check (could be enhanced with role-based auth later)
✅ **Confirm dialogs**: Native confirm() prevents accidental deletions
✅ **Error handling**: Try-catch blocks with user-friendly error messages

## Next Steps

1. **Apply Migration**: Run `supabase db push` to apply database changes
2. **Test Thoroughly**: Go through testing checklist above
3. **Monitor**: Watch for any deletion-related errors in production
4. **Consider Enhancements**:
   - Add role-based admin system instead of hardcoded emails
   - Add deletion audit log (who deleted what, when)
   - Add "undo" functionality with soft-delete
   - Add batch deletion for admins

## Implementation Status

✅ Database migration created
✅ TypeScript types updated
✅ Service layer methods added
✅ PostCard deletion implemented
✅ ReplyCard deletion implemented
✅ ForumPage integration complete
✅ ForumPostDetailPage integration complete

**Status**: Ready for deployment after migration is applied
