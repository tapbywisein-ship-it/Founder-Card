import { apiFetch } from './api';

export type AmbassadorStatus = 'APPLIED' | 'INTERVIEW' | 'ACTIVE' | 'REJECTED';
export type AmbassadorLevel = 'INSIDER' | 'AMBASSADOR' | 'LEADER' | 'ELITE';

export const AMBASSADOR_LEVEL_ORDER: AmbassadorLevel[] = ['INSIDER', 'AMBASSADOR', 'LEADER', 'ELITE'];

export const LEVEL_LABELS: Record<AmbassadorLevel, string> = {
  INSIDER: 'Insider',
  AMBASSADOR: 'Ambassador',
  LEADER: 'Leader',
  ELITE: 'Elite',
};

export const LEVEL_REWARDS: Record<AmbassadorLevel, string> = {
  INSIDER: 'Digital ID + stickers',
  AMBASSADOR: 'T-shirt + physical ID',
  LEADER: 'Hoodie + cap',
  ELITE: 'Limited-edition jacket + exclusive swag box',
};

export interface AmbassadorPublic {
  id: string;
  city: string;
  region?: string | null;
  createdAt: string;
  bookingCount: number;
  level: AmbassadorLevel;
  user: {
    id: string;
    username?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
      company?: string | null;
      position?: string | null;
    } | null;
  };
}

export interface MyAmbassador {
  id: string;
  city: string;
  region?: string | null;
  motivation: string;
  status: AmbassadorStatus;
  reviewNote?: string | null;
  referralCode?: string | null;
  bookingCount?: number;
  level?: AmbassadorLevel;
  nextLevel?: { level: AmbassadorLevel; remaining: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyAmbassadorInput {
  city: string;
  region?: string;
  motivation: string;
}

/** Admin review row: the full application plus the applicant's public profile. */
export interface AmbassadorAdminRow extends MyAmbassador {
  user: AmbassadorPublic['user'];
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ambassadorsService = {
  listActive(city?: string) {
    const qs = city ? `?city=${encodeURIComponent(city)}` : '';
    return apiFetch<{ data: AmbassadorPublic[] }>(`/ambassadors${qs}`);
  },
  getMine() {
    return apiFetch<{ data: MyAmbassador | null }>('/ambassadors/me');
  },
  apply(input: ApplyAmbassadorInput) {
    return apiFetch<{ data: MyAmbassador }>('/ambassadors/apply', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminList(status?: AmbassadorStatus, page = 1, limit = 50) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) qs.set('status', status);
    return apiFetch<{ data: AmbassadorAdminRow[]; pagination: Pagination }>(`/ambassadors/admin?${qs}`);
  },
  updateStatus(id: string, status: AmbassadorStatus, reviewNote?: string) {
    return apiFetch<{ data: MyAmbassador }>(`/ambassadors/admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewNote }),
    });
  },
};
