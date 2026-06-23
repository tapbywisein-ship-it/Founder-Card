import { apiFetch } from './api';

export interface MessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationProfile {
  firstName: string;
  lastName: string;
  avatar: string | null;
  position: string | null;
}

export interface ConversationItem {
  id: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    isMine: boolean;
  } | null;
  otherUser: {
    id: string;
    email: string;
    profile: ConversationProfile | null;
  };
}

export const messagesService = {
  async listConversations(page = 1, limit = 20) {
    return apiFetch<{ data: ConversationItem[]; pagination: unknown }>(
      `/messages?page=${page}&limit=${limit}`
    );
  },

  async startConversation(targetUserId: string) {
    return apiFetch<{ data: { id: string } }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  async listMessages(conversationId: string, page = 1, limit = 50) {
    return apiFetch<{ data: MessageRow[]; pagination: unknown }>(
      `/messages/${conversationId}?page=${page}&limit=${limit}`
    );
  },

  async send(conversationId: string, body: string) {
    return apiFetch<{ data: MessageRow }>(`/messages/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  async markRead(conversationId: string) {
    return apiFetch<{ data: { markedRead: number } }>(
      `/messages/${conversationId}/read`,
      { method: 'POST' }
    );
  },

  async unreadCount() {
    return apiFetch<{ data: { count: number } }>('/messages/unread-count');
  },
};
