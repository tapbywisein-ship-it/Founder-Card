import { ReactNode, useState, useRef, useEffect } from 'react';
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
  LogOut, Trophy, Users, QrCode, MessageCircle, Ticket,
  Building2, X, Search, CreditCard,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { toast } from 'sonner';
import { getPushPermissionState, enablePushNotifications } from '@/services/notifications.service';

const sideNavItems = [
  { label: 'Discover',      icon: Compass,       path: '/discover' },
  { label: 'Events',        icon: Calendar,      path: '/events' },
  { label: 'Connect',       icon: Scan,          path: '/connect' },
  { label: 'Messages',      icon: MessageCircle, path: '/messages' },
  { label: 'Connections',   icon: Users,         path: '/connections' },
  { label: 'Notifications', icon: Bell,          path: '/notifications' },
  { label: 'FK Score',      icon: Trophy,        path: '/gamification' },
  { label: 'My Tickets',    icon: Ticket,        path: '/my-tickets' },
  { label: 'Tap Card',      icon: CreditCard,    path: '/apply-card' },
  { label: 'Profile',       icon: UserIcon,      path: '/profile' },
];

const mobileNav = [
  { label: 'Discover', icon: Compass,       path: '/discover' },
  { label: 'Events',   icon: Calendar,      path: '/events' },
  { label: 'Connect',  icon: Scan,          path: '/connect' },
  { label: 'Messages', icon: MessageCircle, path: '/messages' },
  { label: 'Alerts',   icon: Bell,          path: '/notifications' },
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
  const updateUser = useAppStore((s) => s.updateUser);
  const setActiveRole = useAppStore((s) => s.setActiveRole);
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

  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgOrganization, setOrgOrganization] = useState('');

  const handleLogout = () => { logout(); navigate('/login'); };
  const isOrganizer = user?.role === 'organizer';

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else { setSearchInput(''); setDebouncedQ(''); }
  }, [searchOpen]);

  useEffect(() => {
    const PROMPT_KEY = 'tbw-push-prompted';
    if (localStorage.getItem(PROMPT_KEY)) return;
    if (getPushPermissionState() !== 'default') return;
    const timer = setTimeout(() => {
      localStorage.setItem(PROMPT_KEY, '1');
      toast('Get notified in real time', {
        description: 'Enable push notifications for event reminders and connection alerts.',
        duration: 12_000,
        action: {
          label: 'Enable',
          onClick: () => {
            enablePushNotifications()
              .then(() => toast.success('Push notifications enabled'))
              .catch((err: unknown) =>
                toast.error(err instanceof Error ? err.message : 'Could not enable notifications')
              );
          },
        },
      });
    }, 3_000);
    return () => clearTimeout(timer);
  }, []);

  const { data: searchResults } = useQuery<SearchResult>({
    queryKey: ['search', debouncedQ],
    queryFn: () =>
      apiFetch<{ data: SearchResult }>(`/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const orgRequestMutation = useMutation({
    mutationFn: () =>
      apiFetch('/users/me/request-organizer', {
        method: 'POST',
        body: JSON.stringify({ organization: orgOrganization || undefined }),
      }),
    onSuccess: () => {
      updateUser({ role: 'organizer' });
      setActiveRole('organizer');
      toast.success("You're an organizer now — welcome to your dashboard!");
      setOrgDialogOpen(false);
      setOrgOrganization('');
      navigate('/organizer/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSearchSelect = (path: string) => {
    setSearchOpen(false);
    navigate(path);
  };

  const hasResults = (searchResults?.users?.length ?? 0) > 0 || (searchResults?.events?.length ?? 0) > 0;

  const getBadge = (path: string) => {
    if (path === '/messages') return unreadMessages;
    if (path === '/notifications') return unreadCount;
    if (path === '/connect' || path === '/connections') return pendingRequests ?? 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* ── Left sidebar (desktop) ─────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border p-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="text-xs text-muted-foreground mb-6 px-2">Attendee</p>

        <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Attendee">
          {sideNavItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const badge = getBadge(item.path);
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
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!isOrganizer && (
          <button
            onClick={() => setOrgDialogOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
          >
            <Building2 className="w-4 h-4 flex-shrink-0" /> Become an organizer
          </button>
        )}

        <div className="flex items-center gap-2 pt-3 border-t border-border mt-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Right content area ─────────────────────────────── */}
      <div className="flex-1 md:ml-60 min-h-screen flex flex-col">
        <VerifyEmailBanner />

        {/* Sticky top bar */}
        <div className="sticky top-0 z-30 flex justify-between items-center gap-2 px-4 md:px-8 py-3 bg-background/80 backdrop-blur border-b border-border md:border-none">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="w-9 h-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <div className="md:hidden">
              <ThemeToggle />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="ml-1 w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground text-sm font-semibold border border-border"
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive md:hidden"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <main id="main-content" className="flex-1 p-4 md:p-8 max-w-xwide mx-auto w-full pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Quick-share own card (floating) ───────────────── */}
      <QuickShareButton />

      {/* ── Install prompt (PWA) ──────────────────────────── */}
      <InstallPrompt />

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around px-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        {mobileNav.map((item) => {
          const active = location.pathname.startsWith(item.path);
          const badge = getBadge(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
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
              Unlock the host portal to create and manage your own events. Your account upgrades instantly — you'll still keep access to everything you have today.
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
              onClick={() => orgRequestMutation.mutate()}
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
