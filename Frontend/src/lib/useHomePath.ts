import { useAppStore } from '@/store/appStore';

const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  organizer: '/organizer/dashboard',
  attendee: '/dashboard',
};

/** Returns the correct home/dashboard path for the current user's role. */
export function useHomePath(): string {
  const role = useAppStore((s) => s.user?.role);
  return ROLE_HOME[role ?? 'attendee'] ?? '/dashboard';
}
