import { apiFetch } from './api';

export const adminService = {
  async getDashboardStats() {
    return apiFetch<{ data: {
      totalUsers: number;
      activeUsers: number;
      totalEvents: number;
      totalConnections: number;
      totalFounderCards: number;
      activeFounderCards: number;
      totalRevenue: number;
      recentActivity: string[];
      recentUsers: Array<{
        id: string;
        email: string;
        createdAt: string;
        profile: { firstName: string; lastName: string; avatar: string | null; company: string | null } | null;
      }>;
      signupTrend: Array<{ date: string; count: number }>;
      monthlyGrowth: { users: number; events: number; connections: number };
    } }>('/admin/dashboard');
  },

  async getRevenue(params: { page?: number; limit?: number; search?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ data: Array<{
      id: string;
      status: string;
      amount: number;
      createdAt: string;
      razorpayOrderId: string | null;
      user: {
        id: string;
        email: string;
        profile: { firstName: string; lastName: string; avatar: string | null; company: string | null } | null;
      };
    }>; pagination: unknown }>(`/admin/revenue?${qs.toString()}`);
  },

  async dispatchOrder(payload: { id: string; trackingId: string; trackingProvider: string; nfcTagId?: string }) {
    const { id, ...body } = payload;
    return apiFetch<{ data: unknown }>(`/admin/orders/${id}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async markOrderDelivered(id: string) {
    return apiFetch<{ data: unknown }>(`/admin/orders/${id}/delivered`, { method: 'PATCH' });
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

  async banUser(userId: string, reason: string) {
    return apiFetch<{ data: unknown }>(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getAuditLogs(params: { action?: string; userId?: string; resource?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<{ data: unknown[]; pagination: unknown }>(`/admin/audit-logs?${qs.toString()}`);
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
