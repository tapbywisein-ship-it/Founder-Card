import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { toast } from 'sonner';

export const notifKeys = {
  list: (page: number) => ['notifications', 'list', page] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: notifKeys.list(page),
    queryFn: () => notificationsService.getNotifications(page, limit),
    select: (res) => res.data,
    refetchInterval: 60_000, // poll every 60s as fallback
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    select: (res) => res.data.count,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notifId: string) => notificationsService.markRead(notifId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
