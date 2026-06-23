import { apiFetch } from './api';

export interface BlockedUserEntry {
  id: string;
  blockedAt: string;
  user: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string; avatar: string | null } | null;
  };
}

export const blocksService = {
  async block(userId: string) {
    return apiFetch<{ data: { blocked: boolean } }>(`/users/${userId}/block`, { method: 'POST' });
  },

  async unblock(userId: string) {
    return apiFetch<{ data: { blocked: boolean } }>(`/users/${userId}/block`, { method: 'DELETE' });
  },

  async list() {
    return apiFetch<{ data: BlockedUserEntry[] }>('/users/me/blocks');
  },
};
