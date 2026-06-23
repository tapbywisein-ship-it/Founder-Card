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
