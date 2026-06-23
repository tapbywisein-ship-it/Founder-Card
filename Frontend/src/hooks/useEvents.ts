import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsService, SearchEventsParams } from '@/services/events.service';
import { toast } from 'sonner';
import { trackEventJoin } from '@/lib/analytics';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params: SearchEventsParams) => [...eventKeys.lists(), params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  myRegistrations: () => [...eventKeys.all, 'my-registrations'] as const,
  attendees: (id: string) => [...eventKeys.all, 'attendees', id] as const,
  suggestions: (id: string) => [...eventKeys.all, 'suggestions', id] as const,
};

export const savedKeys = ['events', 'saved'] as const;

export function useSavedEvents(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...savedKeys, page, limit],
    queryFn: () => eventsService.listSaved(page, limit),
    select: (res) => ({ events: res.data, pagination: res.pagination }),
  });
}

export function useToggleSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, save }: { eventId: string; save: boolean }) =>
      eventsService.toggleSave(eventId, save),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: savedKeys });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEventAttendees(eventId: string, enabled = true) {
  return useQuery({
    queryKey: eventKeys.attendees(eventId),
    queryFn: () => eventsService.listEventAttendees(eventId),
    select: (res) => ({ attendees: res.data, pagination: res.pagination }),
    enabled: enabled && !!eventId,
  });
}

export function useEventSuggestions(eventId: string, enabled = true) {
  return useQuery({
    queryKey: eventKeys.suggestions(eventId),
    queryFn: () => eventsService.getEventSuggestions(eventId),
    select: (res) => res.data,
    enabled: enabled && !!eventId,
    staleTime: 5 * 60_000,
  });
}

export function useEvents(params: SearchEventsParams = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventsService.listEvents(params),
    select: (res) => ({ events: res.data, pagination: res.pagination }),
    staleTime: 30_000,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getEvent(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useMyRegistrations(page = 1, limit = 20) {
  return useQuery({
    queryKey: eventKeys.myRegistrations(),
    queryFn: () => eventsService.getMyRegistrations(page, limit),
    select: (res) => ({ registrations: res.data, pagination: res.pagination }),
  });
}

export function useRegisterForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      answers,
    }: {
      eventId: string;
      answers?: Array<{ questionId: string; answer: string }>;
    }) => eventsService.registerForEvent(eventId, answers),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(vars.eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.myRegistrations() });
      qc.invalidateQueries({ queryKey: eventKeys.lists() });
      trackEventJoin({ eventId: vars.eventId });
      toast.success(res.data.message ?? 'Successfully registered!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEventQuestions(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ['events', 'questions', eventId],
    queryFn: () => eventsService.listQuestions(eventId),
    select: (res) => res.data,
    enabled: enabled && !!eventId,
  });
}

export function useCancelRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventsService.cancelRegistration(eventId),
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      qc.invalidateQueries({ queryKey: eventKeys.myRegistrations() });
      toast.success('Registration cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
