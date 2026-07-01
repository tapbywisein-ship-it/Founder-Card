import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizerService, CreateEventPayload } from '@/services/organizer.service';
import type { Event, Pagination } from '@/services/events.service';
import type { Guest, AttendeeItem } from '@/services/organizer.service';
import { toast } from 'sonner';

export const blastKeys = {
  list: (eventId: string) => ['organizer', 'blasts', eventId] as const,
};
export const couponKeys = {
  list: (eventId: string) => ['organizer', 'coupons', eventId] as const,
};

export const orgKeys = {
  dashboard: () => ['organizer', 'dashboard'] as const,
  events: () => ['organizer', 'events'] as const,
  guests: (id: string, params?: object) => ['organizer', 'guests', id, params] as const,
  analytics: (id: string) => ['organizer', 'analytics', id] as const,
  networking: (id: string) => ['organizer', 'networking', id] as const,
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

export function useSendAttendeeBlast() {
  return useMutation({
    mutationFn: (payload: { userIds: string[]; subject: string; body: string }) =>
      organizerService.sendAttendeeBlast(payload),
    onSuccess: (res) => toast.success(`Email sent to ${(res as { data: { sent: number } }).data?.sent ?? 0} attendees`),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendBlast(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; body: string; audience: 'all' | 'registered' | 'waitlist' }) =>
      organizerService.sendEventBlast(eventId, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: blastKeys.list(eventId) });
      toast.success(`Blast sent to ${(res as { data: { sent: number } }).data?.sent ?? 0} recipients`);
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

export function usePromoteFromWaitlist(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => organizerService.promoteFromWaitlist(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.guests(eventId) });
      toast.success('Attendee promoted from waitlist');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBulkCheckIn(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => organizerService.bulkCheckIn(eventId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: orgKeys.guests(eventId) });
      toast.success(`Checked in ${(res as { data: { checkedIn: number } }).data?.checkedIn ?? 0} attendees`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateGuestNote(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) =>
      organizerService.updateGuestNote(eventId, userId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.guests(eventId) });
      toast.success('Note saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useListCoupons(eventId: string) {
  return useQuery({
    queryKey: couponKeys.list(eventId),
    queryFn: () => organizerService.listCoupons(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
  });
}

export function useCreateCoupon(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { code: string; discountPct: number; maxUses?: number; expiresAt?: string }) =>
      organizerService.createCoupon(eventId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.list(eventId) });
      toast.success('Coupon created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCoupon(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (couponId: string) => organizerService.deleteCoupon(eventId, couponId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: couponKeys.list(eventId) });
      toast.success('Coupon deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useListEventBlasts(eventId: string) {
  return useQuery({
    queryKey: blastKeys.list(eventId),
    queryFn: () => organizerService.listEventBlasts(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
  });
}

export function useScheduleBlast(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subject: string; body: string; audience: string; scheduledAt: string }) =>
      organizerService.scheduleBlast(eventId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blastKeys.list(eventId) });
      toast.success('Blast scheduled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
