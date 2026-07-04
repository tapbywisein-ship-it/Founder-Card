import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAppStore } from '@/store/appStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useUnreadMessageCount } from '@/hooks/useMessages';
import { useRequestOrganizer } from '@/hooks/useOrganizer';
import { VerifyEmailBanner } from '@/components/VerifyEmailBanner';
import { QuickShareButton } from '@/components/QuickShareButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Bell, Compass, Calendar, Scan, User as UserIcon,
  LogOut, Plus, Search, Trophy, Users, QrCode, MessageCircle, Ticket,
  Building2, X,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';

const topLinks = [
  { label: 'Discover', path: '/discover' },
  { label: 'Events', path: '/events' },
  { label: 'Connect', path: '/connect' },
  { label: 'Tap Card', path: '/apply-card' },
];

const bottomNav = [
  { label: 'Discover', icon: Compass, path: '/discover' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Connect', icon: Scan, path: '/connect' },
  { label: 'Messages', icon: MessageCircle, path: '/messages' },
  { label: 'Profile', icon: UserIcon, path: '/profile' },
];

interface SearchResult {
  users: Array<{ id: string; username?: string | null; role: string; profile?: { firstName: string; lastName: string; avatar?: string | null; company?: string | null } | null }>;
  events: Array<{ id: string; title: string; slug?: string | null; startDate: string; coverImage?: string | null; city?: string | null; address?: string | null }>;
}

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const { data: pendingRequests } = useQuery({
    queryKey: ['connections', 'pending-count'],
    queryFn: () => apiFetch<{ data: { received: unknown[] } }>('/connections/pending'),
    select: (res) => res.data.received.length,
    staleTime: 30_000,
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Organizer request dialog
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgOrganization, setOrgOrganization] = useState('');

  const handleLogout = () => { logout(); navigate('/login'); };
  const isOrganizer = user?.role === 'organizer';

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // Focus input when drawer opens
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else { setSearchInput(''); setDebouncedQ(''); }
  }, [searchOpen]);

  const { data: searchResults } = useQuery<SearchResult>({
    queryKey: ['search', debouncedQ],
    queryFn: () =>
      apiFetch<{ data: SearchResult }>(`/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const orgRequestMutation = useRequestOrganizer();

  const handleRequestOrganizer = () => {
    orgRequestMutation.mutate(orgOrganization, {
      onSuccess: () => {
        toast.success("You're an organizer now. Welcome to your dashboard!");
        setOrgDialogOpen(false);
        setOrgOrganization('');
        navigate('/organizer/dashboard');
      },
    });
  };

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    navigate(path);
  };

  const hasResults = (searchResults?.users?.length ?? 0) > 0 || (searchResults?.events?.length ?? 0) > 0;

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
                  <Link to="/apply-card"><QrCode className="w-4 h-4 mr-2" /> Tap Card</Link>
                </DropdownMenuItem>
                {!isOrganizer && (
                  <DropdownMenuItem onSelect={() => setOrgDialogOpen(true)}>
                    <Building2 className="w-4 h-4 mr-2" /> Become an organizer
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
            const badge =
              item.path === '/connect' && pendingRequests
                ? pendingRequests
                : item.path === '/messages' && unreadMessages
                ? unreadMessages
                : 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4"
              >
                <div className="relative">
                  <item.icon
                    className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
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

      {/* ── Global search drawer ───────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-card w-full max-w-xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search events and people…"
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
                onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {debouncedQ.length >= 2 && !hasResults && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for "{debouncedQ}"
              </div>
            )}

            {hasResults && (
              <div className="max-h-96 overflow-y-auto divide-y divide-border/50">
                {(searchResults?.users?.length ?? 0) > 0 && (
                  <div className="px-2 py-2">
                    <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">People</p>
                    {searchResults!.users.map((u) => {
                      const name = u.profile
                        ? `${u.profile.firstName} ${u.profile.lastName}`.trim()
                        : u.username ?? 'Unknown';
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleSearchSelect(`/card/${u.id}`)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                        >
                          {u.profile?.avatar ? (
                            <img src={u.profile.avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                              {name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{name}</p>
                            {u.profile?.company && (
                              <p className="text-xs text-muted-foreground truncate">{u.profile.company}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(searchResults?.events?.length ?? 0) > 0 && (
                  <div className="px-2 py-2">
                    <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Events</p>
                    {searchResults!.events.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handleSearchSelect(`/e/${ev.slug ?? ev.id}`)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        {ev.coverImage ? (
                          <img src={ev.coverImage} alt={ev.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {ev.city ? ` · ${ev.city}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!debouncedQ && (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                Type at least 2 characters to search · <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to close
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Become an organizer dialog ─────────────────────── */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Become an Organizer</DialogTitle>
            <DialogDescription>
              Unlock the host portal to create and manage your own events. Your account upgrades instantly. You'll still keep access to everything you have today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-organization">Organization / Company <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="org-organization"
                value={orgOrganization}
                onChange={(e) => setOrgOrganization(e.target.value)}
                placeholder="e.g. Acme Corp, Indie Events Co."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleRequestOrganizer}
              disabled={orgRequestMutation.isPending}
            >
              {orgRequestMutation.isPending ? 'Upgrading…' : 'Become an organizer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
