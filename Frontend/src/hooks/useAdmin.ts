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
