import { apiFetch, apiUpload } from './api';
import { supabase } from '@/lib/supabase';
import type { Event, Pagination } from './events.service';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

export interface TicketTypePayload {
  id: string;
  name: string;
  price: number;
  count: number;
  benefits: string[];
  color: string;
  isEnabled: boolean;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type?: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    meetingUrl?: string;
  };
  capacity?: number;
  ticketPrice?: number;
  coverImage?: string;
  tags?: string[];
  category?: string;
  theme?: string;
  slug?: string;
  requiresApproval?: boolean;
  waitlistEnabled?: boolean;
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  timezone?: string;
  ticketTypes?: TicketTypePayload[];
  communityId?: string;
}

export interface AttendeeItem {
  id: string;
  userId: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  registeredAt: string;
  email: string;
  event: { id: string; title: string; startDate: string };
  user: {
    id: string;
    email: string;
    tier: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
      company?: string;
      position?: string;
      linkedin?: string;
      skills?: string[];
    };
    founderCard?: { status: string } | null;
    gamification?: { fkScore: number; level: number } | null;
  };
}

export interface Guest {
  id: string;
  userId: string;
  status: string;
  eventRole?: 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR';
  checkedIn: boolean;
  checkedInAt?: string | null;
  registeredAt: string;
  amountPaid?: string | null;
  paymentStatus?: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED' | null;
  ticketTierName?: string | null;
  email: string;
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
    company?: string;
    position?: string;
  };
}

export interface EventAnalytics {
  event: { id: string; title: string; startDate: string; capacity: number };
  registrations: {
    total: number;
    attended: number;
    cancelled: number;
    waitlisted: number;
    active: number;
    conversionRate: number;
    capacityUtilization: number;
  };
  quality?: {
    seniorityMix: { name: string; value: number }[];
    topCompanies: { name: string; count: number }[];
    repeatAttendees: number;
    firstTimeAttendees: number;
  };
  funnel?: {
    registered: number;
    checkedIn: number;
    connected: number;
  };
  timeline: { registeredAt: string; _count: number }[];
  leads: Record<string, number>;
}

export const organizerService = {
  async requestOrganizer(organization?: string) {
    return apiFetch('/users/me/request-organizer', {
      method: 'POST',
      body: JSON.stringify({ organization: organization || undefined }),
    });
  },

  async getDashboardStats() {
    return apiFetch<{ data: {
      totalEvents: number;
      upcomingEvents: number;
      totalAttendees: number;
      totalLeads: number;
      totalRevenue: number;
      checkInRate: number;
      registrationTrend: { date: string; count: number }[];
      recentEvents: (Event & { registeredCount: number })[];
    } }>('/organizer/dashboard');
  },

  async getMyEvents(page = 1, limit = 20) {
    // sendPaginated returns { data: [...], pagination: {...} }
    return apiFetch<{ data: (Event & { registeredCount: number })[]; pagination: Pagination }>(
      `/events/organizer?page=${page}&limit=${limit}`
    );
  },

  async createEvent(payload: CreateEventPayload) {
    return apiFetch<{ data: Event }>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEvent(id: string, payload: Partial<CreateEventPayload>) {
    return apiFetch<{ data: Event }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEvent(id: string) {
    return apiFetch<{ data: null }>(`/events/${id}`, { method: 'DELETE' });
  },

  async publishEvent(id: string) {
    return apiFetch<{ data: Event }>(`/events/${id}/publish`, { method: 'POST' });
  },

  async cancelEvent(id: string) {
    return apiFetch<{ data: null }>(`/events/${id}/cancel`, { method: 'POST' });
  },

  async getEventGuests(id: string, params: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    // sendPaginated returns { data: [...guests...], pagination: {...} }
    return apiFetch<{ data: Guest[]; pagination: Pagination }>(
      `/organizer/events/${id}/guests${query}`
    );
  },

  async getAttendees(params: { eventId?: string; search?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: AttendeeItem[]; pagination: Pagination }>(`/organizer/attendees${query}`);
  },

  async checkInAttendee(eventId: string, userId: string) {
    return apiFetch<{ data: Guest }>(`/organizer/events/${eventId}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  async duplicateEvent(eventId: string) {
    return apiFetch<{ data: Event }>(`/organizer/events/${eventId}/duplicate`, {
      method: 'POST',
    });
  },

  async refundAttendee(eventId: string, userId: string) {
    return apiFetch<{ data: { refunded: boolean } }>(
      `/organizer/events/${eventId}/attendees/${userId}/refund`,
      { method: 'POST' }
    );
  },

  async cancelEvent(eventId: string) {
    return apiFetch<{ data: null }>(`/events/${eventId}/cancel`, { method: 'POST' });
  },

  async exportAttendeesCsv(eventId: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${API_URL}/organizer/events/${eventId}/attendees/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to export attendees');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async sendEventBlast(eventId: string, payload: { subject: string; body: string; audience: 'all' | 'registered' | 'waitlist' }) {
    return apiFetch<{ data: { sent: number; failed: number; total: number; recipients: string[] } }>(
      `/organizer/events/${eventId}/blast`,
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  async sendAttendeeBlast(payload: { userIds: string[]; subject: string; body: string }) {
    return apiFetch<{ data: { sent: number; failed: number; total: number; recipients: string[] } }>(
      '/organizer/attendees/blast',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  },

  async getEventAnalytics(id: string) {
    return apiFetch<{ data: EventAnalytics }>(`/organizer/events/${id}/analytics`);
  },

  async getLeads(params: { status?: string; eventId?: string; search?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: unknown[]; pagination: Pagination }>(`/organizer/leads${query}`);
  },

  async updateLeadStatus(leadId: string, status: string, notes?: string) {
    return apiFetch<{ data: unknown }>(`/organizer/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async setEventRole(
    eventId: string,
    userId: string,
    role: 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR'
  ) {
    return apiFetch<{ data: unknown }>(
      `/organizer/events/${eventId}/attendees/${userId}/role`,
      { method: 'PATCH', body: JSON.stringify({ role }) }
    );
  },

  async importAttendees(eventId: string, file: File, dryRun: boolean) {
    return apiUpload<{ data: CsvImportResult }>(
      `/organizer/events/${eventId}/attendees/import?dryRun=${dryRun ? 1 : 0}`,
      file
    );
  },

  async listCohosts(eventId: string) {
    return apiFetch<{ data: Cohost[] }>(`/organizer/events/${eventId}/coorganizers`);
  },
  async addCohost(eventId: string, email: string) {
    return apiFetch<{ data: unknown }>(`/organizer/events/${eventId}/coorganizers`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async removeCohost(eventId: string, userId: string) {
    return apiFetch<{ data: null }>(
      `/organizer/events/${eventId}/coorganizers/${userId}`,
      { method: 'DELETE' }
    );
  },

  async listPendingApprovals(eventId: string) {
    return apiFetch<{ data: PendingRegistration[] }>(
      `/organizer/events/${eventId}/pending-approvals`
    );
  },

  async actionPendingApproval(
    eventId: string,
    regId: string,
    action: 'APPROVE' | 'DENY'
  ) {
    return apiFetch<{ data: unknown }>(
      `/organizer/events/${eventId}/registrations/${regId}/action`,
      { method: 'POST', body: JSON.stringify({ action }) }
    );
  },

  async getNetworkingAnalytics(eventId: string) {
    return apiFetch<{ data: NetworkingAnalytics }>(
      `/organizer/events/${eventId}/networking-analytics`
    );
  },

  async getMatchmaking(eventId: string) {
    return apiFetch<{ data: Matchmaking }>(`/organizer/events/${eventId}/matchmaking`);
  },

  async getEventBlasts(eventId: string) {
    return apiFetch<{ data: EventBlastRecord[] }>(`/organizer/events/${eventId}/blasts`);
  },
};

export interface EventBlastRecord {
  id: string;
  subject: string;
  body: string;
  audience: string;
  sent: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

export interface MatchAttendee {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  company: string | null;
  position: string | null;
}

export interface Matchmaking {
  attendeeCount: number;
  pairs: Array<{
    score: number;
    reasons: string[];
    alreadyConnected: boolean;
    a: MatchAttendee;
    b: MatchAttendee;
  }>;
}

export interface NetworkingAnalytics {
  event: { id: string; title: string };
  connections: number;
  taps: number;
  scanToConnectionRate: number | null;
  funnel: {
    registered: number;
    checkedIn: number;
    madeOneConnection: number;
    madeThreeConnections: number;
  };
  topConnectors: Array<{
    userId: string;
    connections: number;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    position: string | null;
  }>;
}

export interface Cohost {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string; avatar: string | null } | null;
  };
}

export interface PendingRegistration {
  id: string;
  userId: string;
  registeredAt: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position: string | null;
      location: string | null;
    } | null;
  };
  answers: Array<{
    id: string;
    answer: string;
    question: { prompt: string; type: string };
  }>;
}

export interface CsvImportRow {
  rowNumber: number;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  eventRole?: 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR';
}

export interface CsvImportError {
  rowNumber: number;
  reason: string;
}

export interface CsvImportResult {
  dryRun: boolean;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateCount: number;
    willCreateUsers?: number;
    willCreateRegistrations?: number;
    createdUsers?: number;
    createdRegistrations?: number;
    invitesSent?: number;
  };
  valid?: CsvImportRow[];
  invalid: CsvImportError[];
  duplicates: string[];
}
