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
}

export interface PublicCard {
  id: string;
  userId: string;
  status: string;
  memberId: string | null;
  slug: string | null;
  qrCodeUrl: string | null;
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

export const founderCardService = {
  async getMyCard() {
    return apiFetch<{ data: FounderCard | null }>('/founder-cards/me');
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
