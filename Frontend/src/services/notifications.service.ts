import { apiFetch } from './api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  async getNotifications(page = 1, limit = 20) {
    return apiFetch<{ data: { notifications: Notification[]; pagination: unknown; unreadCount: number } }>(
      `/notifications?page=${page}&limit=${limit}`
    );
  },

  async markRead(notificationId: string) {
    return apiFetch<{ data: Notification }>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  async markAllRead() {
    return apiFetch<{ data: null }>('/notifications/read-all', { method: 'PUT' });
  },

  async getUnreadCount() {
    return apiFetch<{ data: { count: number } }>('/notifications/unread-count');
  },
};
