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
};
