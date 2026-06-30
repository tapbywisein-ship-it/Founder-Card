import { apiFetch } from './api';

export interface FounderCard {
  id: string;
  userId: string;
  memberId?: string | null;
  status: 'PENDING' | 'ACTIVE' | 'DEACTIVATED' | 'REJECTED';
  qrCode?: string | null;
  qrCodeUrl?: string | null;
  publicSlug?: string | null;
  nfcTagId?: string | null;
  message?: string | null;
  reason?: string | null;
  appliedAt: string;
  reviewedAt?: string | null;
  physicalCardOrdered?: boolean;
  fulfillmentStatus?: 'PENDING' | 'DISPATCHED' | 'DELIVERED' | null;
  trackingId?: string | null;
  trackingProvider?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
}

export interface CardBlock {
  id: string;
  userId: string;
  type: string;
  label: string;
  url: string;
  sortOrder: number;
}

export interface CardLead {
  id: string;
  name: string;
  email: string;
  message: string | null;
  createdAt: string;
}

export interface PublicCard {
  id: string;
  userId: string;
  status: string;
  memberId: string | null;
  slug: string | null;
  qrCodeUrl: string | null;
  blocks?: CardBlock[];
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position: string | null;
      bio: string | null;
      status: string | null;
      location: string | null;
      twitter: string | null;
      linkedin: string | null;
      website: string | null;
      instagram: string | null;
      skills: string[];
      interests: string[];
      lookingFor: string[];
    } | null;
    gamification: { fkScore: number; level: number } | null;
  };
}

export interface CardAnalytics {
  totalViews: number;
  uniqueViewers: number;
  taps: number;
  connections: number;
  timeseries: { date: string; views: number }[];
  recentViewers: {
    id: string;
    at: string;
    anonymous: boolean;
    userId: string | null;
    name: string | null;
    avatar: string | null;
    company: string | null;
    position: string | null;
  }[];
}

export const founderCardService = {
  async getMyCard() {
    return apiFetch<{ data: FounderCard | null }>('/founder-cards/me');
  },

  async getCardAnalytics() {
    return apiFetch<{ data: CardAnalytics }>('/founder-cards/me/analytics');
  },

  async listBlocks() {
    return apiFetch<{ data: CardBlock[] }>('/founder-cards/me/blocks');
  },

  async createBlock(input: { type: string; label: string; url: string }) {
    return apiFetch<{ data: CardBlock }>('/founder-cards/me/blocks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteBlock(blockId: string) {
    return apiFetch<{ data: null }>(`/founder-cards/me/blocks/${blockId}`, { method: 'DELETE' });
  },

  async captureLead(userId: string, input: { name: string; email: string; message?: string }) {
    return apiFetch<{ data: { ok: boolean } }>(`/founder-cards/public/user/${userId}/lead`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async listLeads() {
    return apiFetch<{ data: CardLead[] }>('/founder-cards/me/leads');
  },

  async applyForCard(message?: string) {
    return apiFetch<{ data: FounderCard }>('/founder-cards/apply', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async generateMyQR() {
    return apiFetch<{ data: FounderCard }>('/founder-cards/me/qr', { method: 'POST' });
  },

  async provisionNfc(nfcTagId: string) {
    return apiFetch<{ data: FounderCard }>('/founder-cards/me/nfc', {
      method: 'POST',
      body: JSON.stringify({ nfcTagId }),
    });
  },

  async getPublicCardBySlug(slug: string) {
    return apiFetch<{ data: PublicCard }>(`/founder-cards/public/slug/${encodeURIComponent(slug)}`);
  },

  async getPublicCardByUsername(username: string) {
    return apiFetch<{ data: PublicCard }>(
      `/founder-cards/public/by-username/${encodeURIComponent(username)}`
    );
  },

  async getPublicCardByUserId(userId: string) {
    return apiFetch<{ data: PublicCard }>(
      `/founder-cards/public/user/${encodeURIComponent(userId)}`
    );
  },
};
