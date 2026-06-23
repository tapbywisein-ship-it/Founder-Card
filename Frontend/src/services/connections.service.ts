import { apiFetch } from './api';

export interface ConnectionProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  company?: string;
  position?: string;
  location?: string;
  bio?: string;
}

export interface ConnectionNote {
  id: string;
  connectionId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommonEvent {
  id: string;
  title: string;
  startDate: string;
  city: string | null;
  status: string;
}

export interface ConnectionContext {
  connection: {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    eventId: string | null;
    event: ConnectionEvent | null;
    createdAt: string;
  } | null;
  conversation: { id: string; lastMessageAt: string } | null;
  commonEvents: CommonEvent[];
  commonSkills: string[];
  commonInterests: string[];
  commonLookingFor: string[];
  theyWantYourSkills: string[];
  youWantTheirSkills: string[];
}

export interface ConnectionEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  eventId?: string | null;
  event?: ConnectionEvent | null;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; email: string; profile?: ConnectionProfile };
  receiver?: { id: string; email: string; profile?: ConnectionProfile };
  user?: { id: string; email: string; profile?: ConnectionProfile };
}

export interface UserSearchResult {
  id: string;
  email: string;
  profile?: ConnectionProfile;
  gamification?: { fkScore: number; level: number };
  founderCard?: { status: string };
}

export const connectionsService = {
  async getConnections(page = 1, limit = 20) {
    return apiFetch<{ data: Connection[]; pagination: unknown }>(
      `/connections?page=${page}&limit=${limit}`
    );
  },

  async getPendingRequests() {
    return apiFetch<{ data: { received: Connection[]; sent: Connection[] } }>(
      '/connections/pending'
    );
  },

  async sendRequest(receiverId: string) {
    return apiFetch<{ data: Connection }>('/connections', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    });
  },

  async acceptRequest(connectionId: string) {
    return apiFetch<{ data: Connection }>(`/connections/${connectionId}/accept`, {
      method: 'PUT',
    });
  },

  async rejectRequest(connectionId: string) {
    return apiFetch<{ data: Connection }>(`/connections/${connectionId}/reject`, {
      method: 'PUT',
    });
  },

  async removeConnection(connectionId: string) {
    return apiFetch<{ data: null }>(`/connections/${connectionId}`, { method: 'DELETE' });
  },

  async searchUsers(q: string, page = 1, limit = 20) {
    return apiFetch<{ data: { users: UserSearchResult[]; pagination: unknown } }>(
      `/users/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
    );
  },

  async findConnectionWith(targetUserId: string) {
    return apiFetch<{ data: { id: string; status: string } | null }>(
      `/connections/with/${encodeURIComponent(targetUserId)}`
    );
  },

  async getContextWith(targetUserId: string) {
    return apiFetch<{ data: ConnectionContext }>(
      `/connections/with/${encodeURIComponent(targetUserId)}/context`
    );
  },

  async listNotes(connectionId: string) {
    return apiFetch<{ data: ConnectionNote[] }>(
      `/connections/${connectionId}/notes`
    );
  },

  async createNote(connectionId: string, body: string) {
    return apiFetch<{ data: ConnectionNote }>(
      `/connections/${connectionId}/notes`,
      { method: 'POST', body: JSON.stringify({ body }) }
    );
  },

  async updateNote(noteId: string, body: string) {
    return apiFetch<{ data: ConnectionNote }>(
      `/connections/notes/${noteId}`,
      { method: 'PATCH', body: JSON.stringify({ body }) }
    );
  },

  async deleteNote(noteId: string) {
    return apiFetch<{ data: null }>(`/connections/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async connectViaScan(input: {
    qrData?: string;
    slug?: string;
    targetUserId?: string;
    eventId?: string | null;
    method?: 'QR' | 'NFC' | 'MANUAL';
  }) {
    const body: Record<string, unknown> = { method: input.method ?? 'QR' };
    if (input.qrData) body.qrData = input.qrData;
    if (input.slug) body.slug = input.slug;
    if (input.targetUserId) body.targetUserId = input.targetUserId;
    if (input.eventId) body.eventId = input.eventId;
    return apiFetch<{ data: Connection }>('/connections/qr-scan', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
