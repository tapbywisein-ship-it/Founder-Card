import { apiFetch } from './api';

export interface CommunitySummary {
  id: string;
  organizerId: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  coverImage: string | null;
  category: string | null;
  isPublic: boolean;
  createdAt: string;
  memberCount: number;
  eventCount: number;
  organizer?: {
    id: string;
    username: string | null;
    profile: { firstName: string | null; lastName: string | null; avatar: string | null; company: string | null } | null;
  };
}

/** A public community in the browse/discover list, with the viewer's join state. */
export interface PublicCommunity extends CommunitySummary {
  isMember: boolean;
}

export interface CommunityEvent {
  id: string;
  title: string;
  slug: string | null;
  startDate: string;
  endDate: string;
  city: string | null;
  locationType: string;
  coverImage: string | null;
  theme: string | null;
  status: string;
}

export interface CommunityDetail {
  community: CommunitySummary;
  events: CommunityEvent[];
  isMember: boolean;
  isOwner: boolean;
}

export interface PostAuthor {
  id: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string | null;
    position: string | null;
  } | null;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  body: string;
  imageUrl: string | null;
  pinned: boolean;
  isAnnouncement: boolean;
  createdAt: string;
  author: PostAuthor;
  commentCount: number;
}

export interface CommunityPostComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: PostAuthor;
}

export interface CreateCommunityPayload {
  name: string;
  description?: string;
  avatar?: string;
  coverImage?: string;
  category?: string;
  isPublic?: boolean;
}

export const communitiesService = {
  async create(payload: CreateCommunityPayload) {
    return apiFetch<{ data: CommunitySummary }>('/communities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async update(id: string, payload: Partial<CreateCommunityPayload>) {
    return apiFetch<{ data: CommunitySummary }>(`/communities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  /** Browse public communities (attendees). Optional search + category filter. */
  async listPublic(params?: { q?: string; category?: string }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: PublicCommunity[] }>(`/communities${suffix}`);
  },
  async listMine() {
    return apiFetch<{ data: CommunitySummary[] }>('/communities/mine');
  },
  async listFollowing() {
    return apiFetch<{ data: CommunitySummary[] }>('/communities/following');
  },
  async getBySlug(slug: string) {
    return apiFetch<{ data: CommunityDetail }>(`/communities/slug/${slug}`);
  },
  async join(id: string) {
    return apiFetch<{ data: { joined: boolean } }>(`/communities/${id}/join`, { method: 'POST' });
  },
  async leave(id: string) {
    return apiFetch<{ data: { joined: boolean } }>(`/communities/${id}/join`, { method: 'DELETE' });
  },
  /** Invite connections to a community — each gets an in-app notification. */
  async invite(id: string, userIds: string[]) {
    return apiFetch<{ data: { invited: number } }>(`/communities/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  // ── Feed ────────────────────────────────────────────────────────────────────
  async listPosts(id: string, page = 1, limit = 20) {
    return apiFetch<{ data: CommunityPost[]; pagination: unknown }>(
      `/communities/${id}/posts?page=${page}&limit=${limit}`
    );
  },
  async createPost(id: string, input: { body: string; imageUrl?: string; pinned?: boolean }) {
    return apiFetch<{ data: CommunityPost }>(`/communities/${id}/posts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  /** Organizer/moderator announcement — pinned post + notifies all members. */
  async announce(id: string, body: string) {
    return apiFetch<{ data: CommunityPost }>(`/communities/${id}/announce`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  async deletePost(id: string, postId: string) {
    return apiFetch<{ data: null }>(`/communities/${id}/posts/${postId}`, { method: 'DELETE' });
  },
  async listComments(postId: string, page = 1, limit = 50) {
    return apiFetch<{ data: CommunityPostComment[]; pagination: unknown }>(
      `/communities/posts/${postId}/comments?page=${page}&limit=${limit}`
    );
  },
  async addComment(postId: string, body: string) {
    return apiFetch<{ data: CommunityPostComment }>(`/communities/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },
  async deleteComment(commentId: string) {
    return apiFetch<{ data: null }>(`/communities/comments/${commentId}`, { method: 'DELETE' });
  },
};
