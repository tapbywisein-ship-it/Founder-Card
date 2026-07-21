import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const HOME_BY_ROLE: Record<string, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Brand logo. When signed in it links to the user's in-app home (so clicking it
 * keeps you inside the app instead of dropping you on the public landing page,
 * which looks like a logout). Anonymous visitors go to the landing page.
 * Pass `to` to override the destination.
 */
export const Logo = ({ size = 'md', to }: { size?: 'sm' | 'md' | 'lg'; to?: string }) => {
  // Logo is ~93×24; scale by height and let width follow the aspect ratio.
  const heights = { sm: 'h-5', md: 'h-6', lg: 'h-8' };

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.user?.role);
  const target = to ?? (isAuthenticated ? HOME_BY_ROLE[role ?? 'attendee'] ?? '/dashboard' : '/');

  // Two variants swapped by the `dark` class (darkMode: 'class') — no JS needed.
  // logo-light = dark text for light backgrounds; logo-dark = white text for dark.
  return (
    <Link to={target} className="flex items-center group">
      <img src="/logo-light.png" alt="TapByWisein" className={`${heights[size]} w-auto block dark:hidden`} />
      <img src="/logo-dark.png" alt="TapByWisein" className={`${heights[size]} w-auto hidden dark:block`} />
    </Link>
  );
};
