import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAppStore } from '@/store/appStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { VerifyEmailBanner } from '@/components/VerifyEmailBanner';
import { QuickShareButton } from '@/components/QuickShareButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell, Compass, Calendar, Scan, User as UserIcon,
  LogOut, Plus, Search, Trophy, Users, QrCode, MessageCircle, Ticket,
} from 'lucide-react';

const topLinks = [
  { label: 'Discover', path: '/discover' },
  { label: 'Events', path: '/events' },
  { label: 'Connect', path: '/connect' },
];

const bottomNav = [
  { label: 'Discover', icon: Compass, path: '/discover' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Connect', icon: Scan, path: '/connect' },
  { label: 'Messages', icon: MessageCircle, path: '/messages' },
  { label: 'Profile', icon: UserIcon, path: '/profile' },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const [searchOpen, setSearchOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  // "+ Create" button only for users who can host events
  const isOrganizer = user?.role === 'organizer';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip to main content — keyboard/screen-reader bypass (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* ── Email verification banner (only when unverified) ─ */}
      <VerifyEmailBanner />

      {/* ── Top Nav (sticky, 64px) ────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-xwide mx-auto h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-1">
              {topLinks.map((link) => {
                const active = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="hidden md:inline-flex w-9 h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <ThemeToggle />

            <Link
              to="/messages"
              aria-label="Messages"
              className="relative inline-flex w-9 h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>

            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative inline-flex w-9 h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {isOrganizer && (
              <Button size="sm" asChild className="hidden md:inline-flex ml-1">
                <Link to="/organizer/events/create">
                  <Plus className="w-4 h-4" />
                  Create
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="ml-1 w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground text-sm font-semibold border border-border"
                >
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase() || 'U'
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{user?.name || 'Member'}</span>
                  <span className="text-xs text-muted-foreground font-normal">FK Score · {user?.fkScore ?? 0}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserIcon className="w-4 h-4 mr-2" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/connections"><Users className="w-4 h-4 mr-2" /> Connections</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-tickets"><Ticket className="w-4 h-4 mr-2" /> My Tickets</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/gamification"><Trophy className="w-4 h-4 mr-2" /> Achievements</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/apply-card"><QrCode className="w-4 h-4 mr-2" /> Founder Card</Link>
                </DropdownMenuItem>
                {!isOrganizer && (
                  <DropdownMenuItem disabled>
                    <Plus className="w-4 h-4 mr-2" /> Become an organizer
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main id="main-content" className="flex-1 px-4 md:px-8 py-6 md:py-10 max-w-xwide w-full mx-auto pb-24 md:pb-10">
        {children}
      </main>

      {/* ── Quick-share own card (floating) ───────────────── */}
      <QuickShareButton />

      {/* ── Install prompt (PWA) ──────────────────────────── */}
      <InstallPrompt />

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      >
        <div className="flex justify-around py-1.5">
          {bottomNav.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4"
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Search drawer placeholder — wired in Phase 2 */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-card w-full max-w-xl mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Search events, people, calendars…"
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
            />
            <p className="text-xs text-muted-foreground mt-2">Press Esc to close · full search wired in Phase 2</p>
          </div>
        </div>
      )}
    </div>
  );
};
