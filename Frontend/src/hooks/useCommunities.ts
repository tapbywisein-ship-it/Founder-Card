import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { communitiesService, type CreateCommunityPayload } from '@/services/communities.service';

const keys = {
  mine: () => ['communities', 'mine'] as const,
  following: () => ['communities', 'following'] as const,
  bySlug: (slug: string) => ['communities', 'slug', slug] as const,
  public: (q: string, category: string) => ['communities', 'public', q, category] as const,
};

/** Browse public communities (attendee discover page). */
export function usePublicCommunities(q = '', category = '') {
  return useQuery({
    queryKey: keys.public(q, category),
    queryFn: () => communitiesService.listPublic({ q: q || undefined, category: category || undefined }),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}

/** Join/leave from the browse list — refreshes every communities query. */
export function useJoinLeaveCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, join }: { id: string; join: boolean }) =>
      join ? communitiesService.join(id) : communitiesService.leave(id),
    onSuccess: (_data, { join }) => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      toast.success(join ? 'Joined community' : 'Left community');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMyCommunities() {
  return useQuery({
    queryKey: keys.mine(),
    queryFn: () => communitiesService.listMine(),
    select: (res) => res.data,
  });
}

export function useFollowedCommunities() {
  return useQuery({
    queryKey: keys.following(),
    queryFn: () => communitiesService.listFollowing(),
    select: (res) => res.data,
  });
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: keys.bySlug(slug),
    queryFn: () => communitiesService.getBySlug(slug),
    select: (res) => res.data,
    enabled: !!slug,
  });
}

export function useCreateCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityPayload) => communitiesService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mine() });
      toast.success('Community created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleCommunityMembership(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, join }: { id: string; join: boolean }) =>
      join ? communitiesService.join(id) : communitiesService.leave(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.bySlug(slug) });
      qc.invalidateQueries({ queryKey: keys.following() });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Feed: posts, comments, announcements ──────────────────────────────────────

const feedKeys = {
  posts: (communityId: string) => ['communities', 'posts', communityId] as const,
  comments: (postId: string) => ['communities', 'comments', postId] as const,
};

export function useCommunityPosts(communityId: string | undefined) {
  return useQuery({
    queryKey: feedKeys.posts(communityId ?? ''),
    queryFn: () => communitiesService.listPosts(communityId as string),
    select: (res) => res.data,
    enabled: !!communityId,
  });
}

/** Create a post or an announcement (announcement also notifies all members). */
export function useCreateCommunityPost(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, announce }: { body: string; announce?: boolean }) =>
      announce
        ? communitiesService.announce(communityId, body)
        : communitiesService.createPost(communityId, { body }),
    onSuccess: (_res, { announce }) => {
      qc.invalidateQueries({ queryKey: feedKeys.posts(communityId) });
      toast.success(announce ? 'Announcement posted — members notified' : 'Posted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCommunityPost(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => communitiesService.deletePost(communityId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.posts(communityId) });
      toast.success('Post deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePostComments(postId: string | null) {
  return useQuery({
    queryKey: feedKeys.comments(postId ?? ''),
    queryFn: () => communitiesService.listComments(postId as string),
    select: (res) => res.data,
    enabled: !!postId,
  });
}

export function useAddComment(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, body }: { postId: string; body: string }) =>
      communitiesService.addComment(postId, body),
    onSuccess: (_res, { postId }) => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      // Refresh the feed too — the post's comment count changed.
      qc.invalidateQueries({ queryKey: feedKeys.posts(communityId) });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
