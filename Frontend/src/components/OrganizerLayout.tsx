import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, Calendar, Users, Download, LogOut, Compass, Wallet,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/organizer/dashboard' },
  { label: 'Create Event', icon: Calendar, path: '/organizer/events/create' },
  { label: 'Attendees', icon: Users, path: '/organizer/attendees' },
  { label: 'Leads', icon: Download, path: '/organizer/leads' },
  { label: 'Payouts', icon: Wallet, path: '/organizer/payouts' },
  // Cross-link to the attendee surfaces — same account can host AND attend.
  { label: 'My Tickets', icon: Compass, path: '/dashboard' },
];

export const OrganizerLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-60 border-r border-border p-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="text-xs text-muted-foreground mb-6 px-2">Organizer</p>
        <nav className="flex-1 space-y-0.5" aria-label="Organizer">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-60 min-h-screen">
        <main className="p-4 md:p-8 max-w-xwide mx-auto">{children}</main>
      </div>
    </div>
  );
};
