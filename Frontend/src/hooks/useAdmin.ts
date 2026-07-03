import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { toast } from 'sonner';

export const adminKeys = {
  dashboard: () => ['admin', 'dashboard'] as const,
  users: (params?: object) => ['admin', 'users', params] as const,
  events: (params?: object) => ['admin', 'events', params] as const,
  settings: () => ['admin', 'settings'] as const,
  founderCards: (params?: object) => ['admin', 'founder-cards', params] as const,
  analytics: () => ['admin', 'analytics'] as const,
  revenue: (params?: object) => ['admin', 'revenue', params] as const,
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: () => adminService.getDashboardStats(),
    select: (res) => res.data,
  });
}

export function useAdminUsers(params = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminService.getUsers(params),
    select: (res) => res,
  });
}

export function useAdminEvents(params = {}) {
  return useQuery({
    queryKey: adminKeys.events(params),
    queryFn: () => adminService.getAdminEvents(params),
    select: (res) => res,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminService.getPlatformSettings(),
    select: (res) => res.data,
  });
}

export function useAdminFounderCards(params = {}) {
  return useQuery({
    queryKey: adminKeys.founderCards(params),
    queryFn: () => adminService.getFounderCardRequests(params),
    select: (res) => res,
  });
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: adminKeys.analytics(),
    queryFn: () => adminService.getAnalytics(),
    select: (res) => res.data,
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User role updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminService.toggleUserActive(userId, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminService.banUser(userId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User banned and notified');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => adminService.getAuditLogs(params),
    select: (res) => ({ logs: res.data, pagination: res.pagination }),
  });
}

export function useReviewFounderCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, status, reason }: { cardId: string; status: 'ACTIVE' | 'REJECTED'; reason?: string }) =>
      adminService.reviewFounderCard(cardId, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'founder-cards'] });
      toast.success('Card reviewed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAdminRevenue(params = {}) {
  return useQuery({
    queryKey: adminKeys.revenue(params),
    queryFn: () => adminService.getRevenue(params),
    select: (res) => ({ items: res.data, pagination: res.pagination }),
  });
}

export function useDispatchOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; trackingId: string; trackingProvider: string; nfcTagId?: string }) =>
      adminService.dispatchOrder(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.revenue({}) });
      toast.success('Order dispatched. Email sent to customer');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkOrderDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.markOrderDelivered(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.revenue({}) });
      toast.success('Order marked as delivered');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminService.updatePlatformSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.settings() });
      toast.success('Setting updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
