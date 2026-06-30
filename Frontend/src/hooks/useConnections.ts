import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsService } from '@/services/connections.service';
import { toast } from 'sonner';

export const connKeys = {
  list: () => ['connections', 'list'] as const,
  pending: () => ['connections', 'pending'] as const,
  search: (q: string) => ['connections', 'search', q] as const,
};

export function useConnections(page = 1, limit = 20) {
  return useQuery({
    queryKey: connKeys.list(),
    queryFn: () => connectionsService.getConnections(page, limit),
    // Backend returns { data: Connection[], pagination }; the page expects
    // `{ connections, pagination }`. Repack into the shape it reads.
    select: (res) => ({ connections: res.data, pagination: res.pagination }),
  });
}

export function useConnectionRequests() {
  return useQuery({
    queryKey: connKeys.pending(),
    queryFn: () => connectionsService.getPendingRequests(),
    select: (res) => res.data,
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: connKeys.search(q),
    queryFn: () => connectionsService.searchUsers(q),
    select: (res) => res.data,
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}

export function useSendConnectionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receiverId: string) => connectionsService.sendRequest(receiverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.pending() });
      toast.success('Connection request sent');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => connectionsService.acceptRequest(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.list() });
      qc.invalidateQueries({ queryKey: connKeys.pending() });
      toast.success('Connection accepted!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => connectionsService.rejectRequest(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.pending() });
      toast.success('Request declined');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => connectionsService.removeConnection(connectionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.list() });
      toast.success('Connection removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useConnectionSuggestions(limit = 5) {
  return useQuery({
    queryKey: ['connections', 'suggestions', limit] as const,
    queryFn: () => connectionsService.getSuggestions(limit),
    select: (res) => res.data,
    staleTime: 2 * 60 * 1000,
  });
}

// ── CRM: per-connection notes + metadata (tags, follow-up reminder) ───────────

export function useConnectionNotes(connectionId: string | null) {
  return useQuery({
    queryKey: ['connections', 'notes', connectionId] as const,
    queryFn: () => connectionsService.listNotes(connectionId as string),
    select: (res) => res.data,
    enabled: !!connectionId,
  });
}

export function useCreateNote(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => connectionsService.createNote(connectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections', 'notes', connectionId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteNote(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => connectionsService.deleteNote(noteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections', 'notes', connectionId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useFollowUps() {
  return useQuery({
    queryKey: ['connections', 'follow-ups'] as const,
    queryFn: () => connectionsService.getFollowUps(),
    select: (res) => res.data,
    staleTime: 30_000,
  });
}

/** Member-gated network search. Returns the raw response so the page can read
 *  results; a 402 error surfaces as the upgrade state. */
export function useNetworkSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['connections', 'network-search', q] as const,
    queryFn: () => connectionsService.searchNetwork(q),
    select: (res) => res.data,
    enabled: q.length >= 2,
    retry: false,
    staleTime: 30_000,
  });
}

export function useConnectionMeta(connectionId: string | null) {
  return useQuery({
    queryKey: ['connections', 'meta', connectionId] as const,
    queryFn: () => connectionsService.getMeta(connectionId as string),
    select: (res) => res.data,
    enabled: !!connectionId,
  });
}

export function useSetConnectionMeta(connectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { tags?: string[]; followUpAt?: string | null; followUpDone?: boolean }) =>
      connectionsService.setMeta(connectionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections', 'meta', connectionId] });
      qc.invalidateQueries({ queryKey: ['connections', 'follow-ups'] });
    },
    // 402 = free-tier follow-up cap. The drawer renders an upgrade prompt for
    // that case, so don't also fire a toast; surface everything else normally.
    onError: (err: Error) => {
      if ((err as { status?: number }).status === 402) return;
      toast.error(err.message);
    },
  });
}
