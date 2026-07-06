import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizerService, CreateEventPayload } from '@/services/organizer.service';
import type { Event, Pagination } from '@/services/events.service';
import type { Guest, AttendeeItem } from '@/services/organizer.service';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

/**
 * Self-serve organizer upgrade — instant, no approval step. Flips the
 * signed-in attendee's role to organizer and reflects it in the store so
 * gated organizer routes + portal chrome unlock immediately.
 */
export function useRequestOrganizer() {
  const updateUser = useAppStore((s) => s.updateUser);
  const setActiveRole = useAppStore((s) => s.setActiveRole);

  return useMutation({
    mutationFn: (organization?: string) => organizerService.requestOrganizer(organization),
    onSuccess: () => {
      updateUser({ role: 'organizer' });
      setActiveRole('organizer');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export const orgKeys = {
  dashboard: () => ['organizer', 'dashboard'] as const,
  events: () => ['organizer', 'events'] as const,
  guests: (id: string, params?: object) => ['organizer', 'guests', id, params] as const,
  analytics: (id: string) => ['organizer', 'analytics', id] as const,
  networking: (id: string) => ['organizer', 'networking', id] as const,
  matchmaking: (id: string) => ['organizer', 'matchmaking', id] as const,
  leads: (params?: object) => ['organizer', 'leads', params] as const,
  attendees: (params?: object) => ['organizer', 'attendees', params] as const,
};

export function useNetworkingAnalytics(eventId: string) {
  return useQuery({
    queryKey: orgKeys.networking(eventId),
    queryFn: () => organizerService.getNetworkingAnalytics(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useMatchmaking(eventId: string) {
  return useQuery({
    queryKey: orgKeys.matchmaking(eventId),
    queryFn: () => organizerService.getMatchmaking(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
    staleTime: 60_000,
  });
}

export function useEventBlasts(eventId: string) {
  return useQuery({
    queryKey: ['organizer', 'blasts', eventId] as const,
    queryFn: () => organizerService.getEventBlasts(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
  });
}

export function useOrgDashboard() {
  return useQuery({
    queryKey: orgKeys.dashboard(),
    queryFn: () => organizerService.getDashboardStats(),
    select: (res) => res.data,
  });
}

export function useMyOrgEvents(page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: orgKeys.events(),
    queryFn: () => organizerService.getMyEvents(page, limit),
    enabled,
    select: (res) => ({
      events: res.data as (Event & { registeredCount: number })[],
      pagination: res.pagination as Pagination,
    }),
  });
}

export function useEventGuests(eventId: string, params: Record<string, unknown> & { liveRefetch?: boolean } = {}) {
  const { liveRefetch, ...apiParams } = params;
  return useQuery({
    queryKey: orgKeys.guests(eventId, apiParams),
    queryFn: () => organizerService.getEventGuests(eventId, apiParams as Parameters<typeof organizerService.getEventGuests>[1]),
    // sendPaginated returns { data: [...guests...], pagination: {...} }
    select: (res) => ({
      guests: res.data as Guest[],
      pagination: res.pagination as Pagination,
    }),
    enabled: !!eventId,
    refetchInterval: liveRefetch ? 15_000 : false,
  });
}

export function useEventAnalytics(eventId: string) {
  return useQuery({
    queryKey: orgKeys.analytics(eventId),
    queryFn: () => organizerService.getEventAnalytics(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
    refetchInterval: 60_000,
  });
}

export function useOrgAttendees(params: { eventId?: string; search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: orgKeys.attendees(params),
    queryFn: () => organizerService.getAttendees(params),
    select: (res) => ({
      attendees: res.data as AttendeeItem[],
      pagination: res.pagination as Pagination,
    }),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => organizerService.createEvent(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.events() });
      qc.invalidateQueries({ queryKey: orgKeys.dashboard() });
      toast.success('Event created!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateEventPayload> }) =>
      organizerService.updateEvent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.events() });
      qc.invalidateQueries({ queryKey: orgKeys.dashboard() });
      toast.success('Event updated!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function usePublishEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizerService.publishEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.events() });
      qc.invalidateQueries({ queryKey: orgKeys.dashboard() });
      toast.success('Event published!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizerService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.events() });
      qc.invalidateQueries({ queryKey: orgKeys.dashboard() });
      toast.success('Event deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCheckInAttendee(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => organizerService.checkInAttendee(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.guests(eventId) });
      toast.success('Attendee checked in!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Report the real delivery outcome so a silent Resend failure doesn't look like success. */
function reportBlastResult(res: unknown, noun: string) {
  const d = (res as { data?: { sent?: number; failed?: number } }).data;
  const sent = d?.sent ?? 0;
  const failed = d?.failed ?? 0;
  if (sent === 0 && failed === 0) {
    toast.error(`No matching ${noun} to email.`);
  } else if (sent === 0) {
    toast.error(`Delivery failed for all ${failed} ${noun}. Check email configuration.`);
  } else if (failed > 0) {
    toast.warning(`Sent to ${sent} ${noun} · ${failed} failed to deliver.`);
  } else {
    toast.success(`Sent to ${sent} ${noun}.`);
  }
}

export function useSendAttendeeBlast() {
  return useMutation({
    mutationFn: (payload: { userIds: string[]; subject: string; body: string }) =>
      organizerService.sendAttendeeBlast(payload),
    onSuccess: (res) => reportBlastResult(res, 'attendees'),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendBlast(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; body: string; audience: 'all' | 'registered' | 'waitlist' }) =>
      organizerService.sendEventBlast(eventId, payload),
    onSuccess: (res) => {
      reportBlastResult(res, 'recipients');
      qc.invalidateQueries({ queryKey: ['organizer', 'blasts', eventId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useOrgLeads(params = {}) {
  return useQuery({
    queryKey: orgKeys.leads(params),
    queryFn: () => organizerService.getLeads(params),
    select: (res) => res,
  });
}
