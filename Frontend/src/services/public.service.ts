import { apiFetch } from './api';

export interface PublicStats {
  founders: number;
  connections: number;
  events: number;
}

export const publicService = {
  async getStats() {
    return apiFetch<{ data: PublicStats }>('/public/stats');
  },

  async requestDemo(input: { name: string; email: string; company?: string; message?: string }) {
    return apiFetch<{ data: { ok: boolean } }>('/public/demo-request', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
