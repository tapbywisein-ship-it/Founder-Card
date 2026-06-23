import { apiFetch } from './api';

export const adminService = {
  async getDashboardStats() {
    return apiFetch<{ data: {
      totalUsers: number;
      activeUsers: number;
      totalEvents: number;
      totalConnections: number;
      totalFounderCards: number;
      recentActivity: unknown[];
    } }>('/admin/dashboard');
  },

  async getUsers(params: { page?: number; limit?: number; search?: string; role?: string; tier?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ data: unknown[]; pagination: unknown }>(`/admin/users?${qs.toString()}`);
  },

  async updateUserRole(userId: string, role: string) {
    return apiFetch<{ data: unknown }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async toggleUserActive(userId: string, isActive: boolean) {
    return apiFetch<{ data: unknown }>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  async getAdminEvents(params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ data: unknown[]; pagination: unknown }>(`/admin/events?${qs.toString()}`);
  },

  async getPlatformSettings() {
    return apiFetch<{ data: { key: string; value: string; type: string; label?: string }[] }>('/admin/settings');
  },

  async updatePlatformSetting(key: string, value: string) {
    return apiFetch<{ data: unknown }>(`/admin/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  async getFounderCardRequests(params: { page?: number; limit?: number; status?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ data: unknown[]; pagination: unknown }>(`/admin/founder-cards?${qs.toString()}`);
  },

  async reviewFounderCard(cardId: string, status: 'ACTIVE' | 'REJECTED', reason?: string) {
    return apiFetch<{ data: unknown }>(`/admin/founder-cards/${cardId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    });
  },

  async getAnalytics() {
    return apiFetch<{ data: unknown }>('/admin/analytics');
  },

  async suspendEvent(eventId: string) {
    // Backend's PUT /admin/events/:id accepts a partial event update; setting
    // status: CANCELLED is the canonical "suspend" action.
    return apiFetch<{ data: unknown }>(`/admin/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
  },

  async deleteEvent(eventId: string) {
    return apiFetch<{ data: unknown }>(`/admin/events/${eventId}`, { method: 'DELETE' });
  },
};
