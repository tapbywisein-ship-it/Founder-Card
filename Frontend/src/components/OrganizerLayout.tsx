import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle, NavbarThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, Calendar, Users, Download, LogOut, Ticket, Wallet, UserCircle, Plus, QrCode, Boxes, Scan, Compass, Network, Menu, X,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',    icon: LayoutDashboard, path: '/organizer/dashboard' },
  { label: 'Create Event', icon: Calendar,         path: '/organizer/events/create' },
  { label: 'Communities',  icon: Boxes,            path: '/organizer/communities' },
  { label: 'Attendees',    icon: Users,            path: '/organizer/attendees' },
  { label: 'Leads',        icon: Download,         path: '/organizer/leads' },
  { label: 'Payouts',      icon: Wallet,           path: '/organizer/payouts' },
  { label: 'Connect',      icon: Scan,             path: '/connect' },
  { label: 'Connections',  icon: Network,          path: '/connections' },
  { label: 'Browse Events', icon: Compass,         path: '/events' },
  { label: 'My Tickets',   icon: Ticket,           path: '/my-tickets' },
  { label: 'Tap Card',     icon: QrCode,           path: '/apply-card' },
  { label: 'Profile',      icon: UserCircle,       path: '/profile' },
];

/* Four primary tabs; everything else (Communities, Leads, Payouts,
   Connections, Browse Events, My Tickets, Tap Card, Profile…) lives in the
   "More" sheet, which renders the same navItems list as the desktop sidebar —
   so a new nav item can never silently go missing on mobile again. */
const mobileNav = [
  { label: 'Home',      icon: LayoutDashboard, path: '/organizer/dashboard' },
  { label: 'Attendees', icon: Users,            path: '/organizer/attendees' },
  { label: 'New',       icon: Plus,             path: '/organizer/events/create' },
  { label: 'Connect',   icon: Scan,             path: '/connect' },
];

export const OrganizerLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const handleLogout = () => { logout(); navigate('/login'); };
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <NavbarThemeToggle />
      <aside className="group hidden md:flex flex-col w-16 hover:w-60 transition-[width] duration-200 ease-out overflow-hidden border-r border-border px-2 py-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-1"><Logo /></div>
        <p className="text-xs text-muted-foreground mb-6 px-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Organizer</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Organizer">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 pt-3 border-t border-border">
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Sign out</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-16 min-h-screen min-w-0">
        <main className="p-4 md:p-8 max-w-xwide mx-auto pb-24 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around px-2 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {mobileNav.map((item) => {
          const active = location.pathname === item.path;
          const isNew = item.label === 'New';
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className={isNew ? 'w-8 h-8 rounded-full bg-primary flex items-center justify-center' : ''}>
                <item.icon className={`${isNew ? 'w-4 h-4 text-primary-foreground' : 'w-5 h-5'}`} />
              </div>
              {!isNew && <span className="text-[10px] font-medium">{item.label}</span>}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More navigation"
          className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-muted-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Mobile "More" sheet — full nav (same items as the desktop sidebar) */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-card shadow-card p-4"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Menu</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="inline-flex w-8 h-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center transition-colors ${
                      active
                        ? 'border-primary/40 bg-accent text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
