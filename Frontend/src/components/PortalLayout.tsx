import { ReactNode } from 'react';
import { useAppStore } from '@/store/appStore';
import { AppLayout } from '@/components/AppLayout';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { AdminLayout } from '@/components/AdminLayout';

/**
 * Renders the chrome that matches the current user's role, so shared pages
 * (e.g. Profile) keep each portal's own sidebar/nav instead of always falling
 * back to the attendee layout.
 *   attendee  → AppLayout       (Discover / Events / Connect)
 *   organizer → OrganizerLayout (Dashboard / Create Event / Payouts …)
 *   admin     → AdminLayout     (Users / Events / Analytics …)
 */
export const PortalLayout = ({ children }: { children: ReactNode }) => {
  const role = useAppStore((s) => s.user?.role);

  if (role === 'organizer') return <OrganizerLayout>{children}</OrganizerLayout>;
  if (role === 'admin') return <AdminLayout>{children}</AdminLayout>;
  return <AppLayout>{children}</AppLayout>;
};
