import { apiFetch } from './api';

export interface Lead {
  id: string;
  eventId: string;
  attendeeId: string;
  organizerId: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'ARCHIVED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  attendee?: {
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
      company?: string;
      position?: string;
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
  };
  event?: {
    id: string;
    title: string;
    startDate: string;
  };
}

export const leadsService = {
  async getLeads(params: { status?: string; eventId?: string; search?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: Lead[]; pagination: unknown }>(`/organizer/leads${query}`);
  },

  async updateLeadStatus(leadId: string, status: string, notes?: string) {
    return apiFetch<{ data: Lead }>(`/organizer/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async exportLeads(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return apiFetch<{ data: unknown[] }>(`/organizer/leads/export${query}`);
  },
};
