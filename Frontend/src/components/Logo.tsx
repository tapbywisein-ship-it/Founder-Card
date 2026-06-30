import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
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
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.user?.role);
  const target = to ?? (isAuthenticated ? HOME_BY_ROLE[role ?? 'attendee'] ?? '/dashboard' : '/');

  return (
    <Link to={target} className="flex items-center gap-2 group">
      <Zap className={`${iconSizes[size]} text-primary fill-primary`} />
      <span className={`font-semibold tracking-tight text-foreground ${sizes[size]}`}>
        TapByWisein
      </span>
    </Link>
  );
};
