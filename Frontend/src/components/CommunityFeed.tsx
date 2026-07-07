import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';
import {
  useCommunityPosts,
  useCreateCommunityPost,
  useDeleteCommunityPost,
  usePostComments,
  useAddComment,
} from '@/hooks/useCommunities';
import type { CommunityPost, PostAuthor } from '@/services/communities.service';
import {
  MessagesSquare, Megaphone, Pin, Trash2, MessageCircle, Send, Loader2,
} from 'lucide-react';

const authorName = (a: PostAuthor | null | undefined) =>
  a?.profile ? `${a.profile.firstName} ${a.profile.lastName}`.trim() : 'Member';

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Avatar = ({ author, size = 'md' }: { author: PostAuthor | null | undefined; size?: 'sm' | 'md' }) => {
  const name = authorName(author);
  const cls = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return author?.profile?.avatar ? (
    <img src={author.profile.avatar} alt="" className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-secondary flex items-center justify-center font-semibold shrink-0`}>
      {name[0]?.toUpperCase() ?? 'M'}
    </div>
  );
};

/** One post: body + meta + expandable comment thread. */
const PostCard = ({
  post,
  communityId,
  canModerate,
}: {
  post: CommunityPost;
  communityId: string;
  canModerate: boolean;
}) => {
  const user = useAppStore((s) => s.user);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const { data: comments, isLoading: commentsLoading } = usePostComments(showComments ? post.id : null);
  const addComment = useAddComment(communityId);
  const deletePost = useDeleteCommunityPost(communityId);

  const name = authorName(post.author);
  const p = post.author?.profile;
  const canDelete = canModerate || post.authorId === user?.id;

  const submitComment = () => {
    const body = comment.trim();
    if (!body) return;
    addComment.mutate({ postId: post.id, body }, { onSuccess: () => setComment('') });
  };

  return (
    <Surface className={post.isAnnouncement ? 'border-primary/30 bg-primary/5' : undefined}>
      <div className="flex items-start gap-3">
        <Avatar author={post.author} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/card/${post.authorId}`} className="text-sm font-semibold text-foreground hover:text-primary truncate">
              {name}
            </Link>
            {post.isAnnouncement && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                <Megaphone className="w-2.5 h-2.5" /> Announcement
              </span>
            )}
            {post.pinned && !post.isAnnouncement && <Pin className="w-3 h-3 text-muted-foreground" />}
            <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{timeAgo(post.createdAt)}</span>
          </div>
          {(p?.position || p?.company) && (
            <p className="text-[11px] text-muted-foreground truncate">
              {[p?.position, p?.company].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-sm text-foreground leading-relaxed mt-1.5 whitespace-pre-wrap break-words">{post.body}</p>
          {post.imageUrl && (
            <img src={post.imageUrl} alt="" loading="lazy" className="mt-2 rounded-lg max-h-80 object-cover" />
          )}

          <div className="flex items-center gap-3 mt-2.5">
            <button
              type="button"
              onClick={() => setShowComments((s) => !s)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {post.commentCount > 0 ? `${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''}` : 'Comment'}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this post?')) deletePost.mutate(post.id);
                }}
                disabled={deletePost.isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>

          {showComments && (
            <div className="mt-3 space-y-2.5 border-t border-border pt-3">
              {commentsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                (comments ?? []).map((cm) => (
                  <div key={cm.id} className="flex items-start gap-2">
                    <Avatar author={cm.author} size="sm" />
                    <div className="min-w-0 flex-1 rounded-lg bg-muted/40 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{authorName(cm.author)}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(cm.createdAt)}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">{cm.body}</p>
                    </div>
                  </div>
                ))
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  placeholder="Write a comment…"
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={submitComment} disabled={!comment.trim() || addComment.isPending}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
};

/**
 * Community feed: composer (members; owners can post announcements that
 * notify every member) + posts with comments. Rendered on the community page.
 */
export const CommunityFeed = ({
  communityId,
  isMember,
  isOwner,
}: {
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
}) => {
  const [body, setBody] = useState('');
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const { data: posts, isLoading } = useCommunityPosts(communityId);
  const createPost = useCreateCommunityPost(communityId);

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    createPost.mutate(
      { body: trimmed, announce: isOwner && asAnnouncement },
      { onSuccess: () => { setBody(''); setAsAnnouncement(false); } }
    );
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Feed</h2>

      {(isMember || isOwner) && (
        <Surface className="mb-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Share something with the community…"
            maxLength={4000}
          />
          <div className="flex items-center justify-between mt-2">
            {isOwner ? (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={asAnnouncement}
                  onChange={(e) => setAsAnnouncement(e.target.checked)}
                  className="accent-[hsl(var(--primary))]"
                />
                <Megaphone className="w-3.5 h-3.5" /> Announce (notifies all members)
              </label>
            ) : <span />}
            <Button size="sm" onClick={submit} disabled={!body.trim() || createPost.isPending}>
              {createPost.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
            </Button>
          </div>
        </Surface>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <Surface key={i} className="h-24 animate-pulse" />)}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <Surface className="text-center py-10">
          <MessagesSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isMember || isOwner ? 'No posts yet — start the conversation.' : 'No posts yet — follow to join the conversation.'}
          </p>
        </Surface>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).map((post) => (
            <PostCard key={post.id} post={post} communityId={communityId} canModerate={isOwner} />
          ))}
        </div>
      )}
    </div>
  );
};
