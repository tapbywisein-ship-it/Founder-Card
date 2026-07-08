import { apiFetch } from './api';
import { mapBackendUser, type BackendUser } from './auth.service';
import type { User } from '@/store/appStore';

export interface EventLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  meetingUrl?: string;
}

/** Public, aggregate-only networking impact report (shareable with sponsors). */
export interface EventImpactReport {
  event: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    city: string | null;
    locationType: string;
    coverImage: string | null;
    theme: string | null;
    organizer: {
      id: string;
      username: string | null;
      profile: {
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        company: string | null;
      } | null;
    };
  };
  metrics: {
    registered: number;
    checkedIn: number;
    connections: number;
    taps: number;
    madeOneConnection: number;
    madeThreeConnections: number;
    avgConnectionsPerAttendee: number;
    checkInRate: number;
    networkedRate: number;
    superConnectorRate: number;
    scanToConnectionRate: number | null;
  };
  generatedAt: string;
}

export interface EventOrganizer {
  id: string;
  username?: string | null;
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
    company?: string;
  };
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  locationType: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  meetingUrl?: string;
  capacity: number;
  ticketPrice?: string | null;
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    count: number;
    isEnabled?: boolean;
  }>;
  coverImage?: string | null;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  category?: string | null;
  theme?: string;
  slug?: string | null;
  requiresApproval: boolean;
  waitlistEnabled: boolean;
  /** Optional "register by" deadline; when unset the UI counts down to startDate. */
  registrationDeadline?: string | null;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  createdAt: string;
  updatedAt: string;
  organizerId: string;
  organizer?: EventOrganizer;
  registeredCount?: number;
  spotsLeft?: number;
  registrationStatus?: 'REGISTERED' | 'ATTENDED' | 'CANCELLED' | 'WAITLISTED' | null;
  /** Non-cancelled registration count per ticketTierId (for per-tier sold-out). */
  soldByTier?: Record<string, number>;
  /** Accepted connections made at this event (social proof). */
  connectionsCount?: number;
}

export type RegistrationStatus =
  | 'REGISTERED'
  | 'ATTENDED'
  | 'CANCELLED'
  | 'WAITLISTED'
  | 'PENDING_APPROVAL';

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  checkedIn: boolean;
  checkedInAt?: string | null;
  amountPaid?: string | null;
  paymentStatus?: 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED' | null;
  ticketTierName?: string | null;
  registeredAt: string;
  event?: Event;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EventsResponse {
  data: Event[];
  pagination: Pagination;
}

export interface EventResponse {
  data: Event;
}

export interface RegistrationsResponse {
  data: EventRegistration[];
  pagination: Pagination;
}

export interface SearchEventsParams {
  q?: string;
  category?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  tags?: string;
  city?: string;
  country?: string;
  /** Discover free/paid toggle. */
  price?: 'free' | 'paid';
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  /** Filter to events both me and this user are registered for. */
  withUser?: string;
}

export interface EventSpeaker {
  id: string;
  eventId: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  avatar: string | null;
  position: number;
}

export interface EventAgendaItem {
  id: string;
  eventId: string;
  startsAt: string;
  endsAt: string | null;
  title: string;
  description: string | null;
  speakerId: string | null;
  speaker?: { id: string; name: string; avatar: string | null } | null;
}

export interface EventQuestion {
  id: string;
  eventId: string;
  prompt: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT';
  options: string[] | null;
  required: boolean;
  position: number;
}

export type EventRole = 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR';

export interface EventAttendee {
  registrationId: string;
  userId: string;
  eventRole: EventRole;
  checkedIn: boolean;
  checkedInAt: string | null;
  registeredAt: string;
  user: {
    id: string;
    email?: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position: string | null;
      location: string | null;
    } | null;
    founderCard: { id: string; status: string; publicSlug: string | null } | null;
    gamification: { fkScore: number; level: number } | null;
  };
}

export interface EventSuggestion {
  userId: string;
  eventRole: EventRole;
  score: number;
  /** Why this person surfaced — rendered as match chips. */
  commonSkills?: string[];
  commonInterests?: string[];
  /** Skills they have that you said you're looking for. */
  youWantTheirSkills?: string[];
  /** Skills you have that they said they're looking for. */
  theyWantYourSkills?: string[];
  user: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position: string | null;
      skills: string[];
      interests: string[];
      lookingFor: string[];
    } | null;
    founderCard: { status: string; publicSlug: string | null } | null;
    gamification: { fkScore: number; level: number } | null;
  };
}

export const eventsService = {
  async listEvents(params: SearchEventsParams = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<EventsResponse>(`/events${query}`);
  },

  async getEvent(id: string) {
    return apiFetch<EventResponse>(`/events/${id}`);
  },

  /** Public aggregate networking impact report — no auth required. */
  async getEventImpactReport(id: string) {
    return apiFetch<{ data: EventImpactReport }>(`/events/${id}/impact`);
  },

  async registerForEvent(
    id: string,
    answers?: Array<{ questionId: string; answer: string }>
  ) {
    return apiFetch<{ data: { registration: EventRegistration; message: string } }>(
      `/events/${id}/register`,
      {
        method: 'POST',
        body: answers && answers.length > 0 ? JSON.stringify({ answers }) : undefined,
      }
    );
  },

  /**
   * Luma-style guest RSVP — works for unauthenticated users. Backend silently
   * finds-or-creates the user keyed by email (one email = one account).
   *
   * Auto-sign-in (zero-friction Luma flow) only happens for accounts that
   * AREN'T password-protected — otherwise tokens/user are null and the
   * caller should prompt the visitor to sign in normally.
   * `requiresSignIn` is true exactly when the email is a claimed account.
   */
  async rsvpAsGuest(
    eventId: string,
    payload: { email: string; name: string }
  ): Promise<{
    registration: EventRegistration;
    message: string;
    isNewUser: boolean;
    user: User | null;
    tokens: null;
    requiresSignIn: boolean;
  }> {
    const res = await apiFetch<{
      data: {
        registration: EventRegistration;
        message: string;
        isNewUser: boolean;
        userEmail: string;
        user: BackendUser | null;
        tokens: null;
        requiresSignIn: boolean;
      };
    }>(`/events/${eventId}/rsvp-guest`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      registration: res.data.registration,
      message: res.data.message,
      isNewUser: res.data.isNewUser,
      user: res.data.user ? mapBackendUser(res.data.user) : null,
      tokens: null,
      requiresSignIn: res.data.requiresSignIn,
    };
  },

  async cancelRegistration(id: string) {
    return apiFetch<{ data: null }>(`/events/${id}/register`, { method: 'DELETE' });
  },

  // ── Post-event feedback ─────────────────────────────────────────────────────
  async submitFeedback(id: string, input: { rating: number; nps?: number; comment?: string }) {
    return apiFetch<{ data: { rating: number } }>(`/events/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async getMyFeedback(id: string) {
    return apiFetch<{ data: { rating: number; nps: number | null; comment: string | null } | null }>(
      `/events/${id}/feedback/mine`
    );
  },
  /** Organizer-only aggregate. */
  async getFeedbackSummary(id: string) {
    return apiFetch<{ data: {
      count: number;
      avgRating: number | null;
      npsScore: number | null;
      npsResponses: number;
      comments: Array<{ rating: number; comment: string; createdAt: string; name: string }>;
    } }>(`/events/${id}/feedback/summary`);
  },

  /** Clone an event into a fresh DRAFT (organizer). */
  async duplicateEvent(id: string) {
    return apiFetch<{ data: Event }>(`/events/${id}/duplicate`, { method: 'POST' });
  },

  async listEventAttendees(
    eventId: string,
    page = 1,
    limit = 50
  ) {
    return apiFetch<{ data: EventAttendee[]; pagination: unknown }>(
      `/events/${eventId}/attendees-public?page=${page}&limit=${limit}`
    );
  },

  async getEventSuggestions(eventId: string, limit = 10) {
    return apiFetch<{ data: EventSuggestion[] }>(
      `/events/${eventId}/suggestions?limit=${limit}`
    );
  },

  async getCheckInToken(eventId: string) {
    return apiFetch<{ data: { token: string; eventId: string } }>(
      `/events/${eventId}/checkin-token`
    );
  },

  async selfCheckIn(token: string) {
    return apiFetch<{
      data: {
        event: { id: string; title: string };
        registration: unknown;
        alreadyCheckedIn: boolean;
      };
    }>(`/events/checkin/${encodeURIComponent(token)}`, { method: 'POST' });
  },

  async listSpeakers(eventId: string) {
    return apiFetch<{ data: EventSpeaker[] }>(`/events/${eventId}/speakers`);
  },

  async listAgenda(eventId: string) {
    return apiFetch<{ data: EventAgendaItem[] }>(`/events/${eventId}/agenda`);
  },

  async listQuestions(eventId: string) {
    return apiFetch<{ data: EventQuestion[] }>(`/events/${eventId}/questions`);
  },

  async toggleSave(eventId: string, save: boolean) {
    return apiFetch<{ data: { saved: boolean } }>(`/events/${eventId}/save`, {
      method: save ? 'POST' : 'DELETE',
    });
  },

  async listSaved(page = 1, limit = 20) {
    return apiFetch<{ data: Event[]; pagination: unknown }>(
      `/events/saved?page=${page}&limit=${limit}`
    );
  },

  async getMyRegistrations(page = 1, limit = 20) {
    return apiFetch<RegistrationsResponse>(`/events/my?page=${page}&limit=${limit}`);
  },
};
