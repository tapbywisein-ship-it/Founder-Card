import { useState, useRef, useEffect, useMemo } from 'react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { PortalLayout } from '@/components/PortalLayout';
import { SignInModal } from '@/components/SignInModal';
import { RoleChoiceModal } from '@/components/RoleChoiceModal';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, Navigate } from 'react-router-dom';
import { useCreateEvent, useRequestOrganizer } from '@/hooks/useOrganizer';
import { useAppStore } from '@/store/appStore';
import { EVENT_THEMES, THEME_IDS } from '@/lib/eventThemes';
import { getCountryOptions, getStateOptions, getCityOptions, getCountryName, getStateName } from '@/lib/geo';
import { apiUpload } from '@/services/api';
import { toast } from 'sonner';
import {
  Calendar, Check, MapPin, Upload, X, Plus, Trash2, Shuffle, Globe, Building2, Loader2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'UTC',                 label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Kolkata',        label: 'IST - India (+05:30)' },
  { value: 'Asia/Dubai',          label: 'GST - Dubai (+04:00)' },
  { value: 'Asia/Singapore',      label: 'SGT - Singapore (+08:00)' },
  { value: 'Asia/Tokyo',          label: 'JST - Tokyo (+09:00)' },
  { value: 'Asia/Shanghai',       label: 'CST - Shanghai (+08:00)' },
  { value: 'Europe/London',       label: 'GMT - London (+00:00)' },
  { value: 'Europe/Paris',        label: 'CET - Paris (+01:00)' },
  { value: 'America/New_York',    label: 'EST - New York (-05:00)' },
  { value: 'America/Chicago',     label: 'CST - Chicago (-06:00)' },
  { value: 'America/Los_Angeles', label: 'PST - Los Angeles (-08:00)' },
  { value: 'Australia/Sydney',    label: 'AEDT - Sydney (+11:00)' },
];

const DEFAULT_TICKET_TYPES: TicketType[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 5000,
    count: 10,
    benefits: ['VIP seating', 'Networking dinner', 'Speaker meet & greet', 'Swag bag'],
    color: 'gold',
    isEnabled: true,
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 2000,
    count: 30,
    benefits: ['Reserved seating', 'Lunch included', 'Networking session'],
    color: 'silver',
    isEnabled: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 500,
    count: 60,
    benefits: ['General admission', 'Coffee breaks'],
    color: 'blue',
    isEnabled: true,
  },
];

const TICKET_COLORS: Record<string, string> = {
  gold:   'from-amber-500/20 to-yellow-500/20 border-amber-500/40',
  silver: 'from-slate-400/20 to-gray-300/20 border-slate-400/40',
  blue:   'from-blue-500/20 to-indigo-500/20 border-blue-500/40',
  green:  'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
  purple: 'from-purple-500/20 to-violet-500/20 border-purple-500/40',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketType {
  id: string;
  name: string;
  price: number;
  count: number;
  benefits: string[];
  color: string;
  isEnabled: boolean;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  locationType: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
  address: string;
  city: string;
  /** ISO state code, e.g. "TG" — converted to the full state name on submit. */
  state: string;
  /** ISO country code, e.g. "IN" — converted to the full country name on submit. */
  country: string;
  pincode: string;
  meetingUrl: string;
  coverImage: string;
  theme: string;
  useTicketTypes: boolean;
  capacity: number;
  isPaid: boolean;
  ticketPrice: string;
  ticketTypes: TicketType[];
  requiresApproval: boolean;
  waitlistEnabled: boolean;
  visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  tags: string;
  slug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BECOME_ORGANIZER_STEPS = [
  'Click "Become an organizer" below',
  'Optionally add your company or event brand name',
  "You're upgraded instantly — no approval or waiting period",
  'You land right back here, ready to create your first event',
];

const CreateEventPage = () => {
  const navigate = useNavigate();
  const createMutation = useCreateEvent();
  const requestOrgMutation = useRequestOrganizer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Luma pattern: render the form for signed-out visitors too. The modal
  // overlays the page, so they can see what they're signing in for. Form
  // state persists across the auth round-trip because we don't unmount.
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const userRole = useAppStore((s) => s.user?.role);
  const [orgName, setOrgName] = useState('');

  // ─── Auth gate ───────────────────────────────────────────────────────────
  // All gate hooks live ABOVE the early returns below so hook order stays stable
  // regardless of auth/role state (Rules of Hooks).

  // Signed-out visitors first pick a path (organize vs attend), then sign in.
  const [gateStep, setGateStep] = useState<'choose' | 'organizer' | 'attendee' | null>(
    isAuthenticated ? null : 'choose'
  );
  useEffect(() => {
    setGateStep(isAuthenticated ? null : 'choose');
  }, [isAuthenticated]);

  // Organizer path: users who explicitly chose "Organize" carry a pending-upgrade
  // flag (set in SignInModal). The backend starts everyone as ATTENDEE, so we
  // auto-run the instant self-serve upgrade here instead of making them click the
  // manual "Become an organizer" card. Seeded from the flag at mount so the manual
  // card never flashes.
  const [autoUpgrading, setAutoUpgrading] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('fk-pending-organizer-upgrade') === '1'
  );
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = localStorage.getItem('fk-pending-organizer-upgrade') === '1';
    if (pending && userRole === 'attendee') {
      localStorage.removeItem('fk-pending-organizer-upgrade');
      setAutoUpgrading(true);
      requestOrgMutation.mutate('', { onError: () => setAutoUpgrading(false) });
    } else if (userRole && userRole !== 'attendee') {
      // Already elevated (or admin) — drop any stale flag.
      localStorage.removeItem('fk-pending-organizer-upgrade');
      setAutoUpgrading(false);
    }
    // requestOrgMutation is stable from react-query; excluded to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole]);

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    startDate: '',
    startTime: '19:00',
    endDate: '',
    endTime: '20:00',
    timezone: 'Asia/Kolkata',
    locationType: 'IN_PERSON',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    meetingUrl: '',
    coverImage: '',
    theme: 'indigo',
    useTicketTypes: false,
    capacity: 100,
    isPaid: false,
    ticketPrice: '',
    ticketTypes: DEFAULT_TICKET_TYPES,
    requiresApproval: false,
    waitlistEnabled: true,
    visibility: 'PUBLIC',
    tags: '',
    slug: '',
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Location cascade: country → state → city ────────────────────────────────
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const stateOptions = useMemo(
    () => (form.country ? getStateOptions(form.country) : []),
    [form.country]
  );
  const cityOptions = useMemo(
    () => (form.country && form.state ? getCityOptions(form.country, form.state) : []),
    [form.country, form.state]
  );

  // ─── Role guards ───────────────────────────────────────────────────────────
  // Kept below all hooks so hook order stays stable across renders (Rules of Hooks).

  // Admins manage events via /admin — bounce them to their dashboard.
  if (isAuthenticated && userRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Attendees can't create events — offer the instant self-serve upgrade instead
  // of silently bouncing them away. Once the mutation flips their role, this same
  // component re-renders past this guard and shows the real form, no navigation needed.
  if (isAuthenticated && userRole === 'attendee') {
    // Organizer path: instant self-serve upgrade is running — show a brief
    // loading state instead of the manual card.
    if (autoUpgrading) {
      return (
        <PortalLayout>
          <div className="max-w-md mx-auto py-8 md:py-12">
            <Surface className="text-center space-y-4 py-10">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Setting up your organizer account…</h1>
                <p className="mt-1 text-sm text-muted-foreground">This only takes a moment.</p>
              </div>
            </Surface>
          </div>
        </PortalLayout>
      );
    }
    return (
      <PortalLayout>
        <div className="max-w-md mx-auto py-8 md:py-12">
          <Surface className="text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Only organizers can create events</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade your account to start hosting — it's instant and free.
              </p>
            </div>

            <div className="text-left space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                How to become an organizer
              </p>
              {BECOME_ORGANIZER_STEPS.map((step, i) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground">{step}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="orgName">Organization name (optional)</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Events"
              />
            </div>

            <Button
              className="w-full"
              onClick={() =>
                requestOrgMutation.mutate(orgName, {
                  onSuccess: () => toast.success("You're an organizer now. Let's create your event!"),
                })
              }
              disabled={requestOrgMutation.isPending}
            >
              {requestOrgMutation.isPending ? 'Upgrading…' : 'Become an organizer'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/dashboard')}>
              Maybe later
            </Button>
          </Surface>
        </div>
      </PortalLayout>
    );
  }

  // ── Ticket allocation ─────────────────────────────────────────────────────

  const allocateTicketSeats = (totalCapacity: number, currentTypes: TicketType[]) => {
    const cap = Math.max(0, Math.floor(totalCapacity));
    const premiumCount = Math.floor(cap * 0.1);
    const silverCount = Math.floor(cap * 0.3);
    const basicCount = Math.max(0, cap - premiumCount - silverCount);

    const counts: Record<string, number> = {
      premium: premiumCount,
      silver: silverCount,
      basic: basicCount,
    };

    return currentTypes.map((t) => ({
      ...t,
      count: counts[t.id] ?? t.count,
    }));
  };

  const toISO = (date: string, time: string) =>
    date ? new Date(`${date}T${time}:00`).toISOString() : '';

  // ── Image upload ──────────────────────────────────────────────────────────

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Upload to backend
    setUploading(true);
    try {
      const res = await apiUpload<{ data: { url: string } }>('/media/upload', file);
      set('coverImage', res.data.url);
      toast.success('Image uploaded');
    } catch {
      // Keep local preview, store data URL as fallback
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        set('coverImage', dataUrl);
      };
      reader.readAsDataURL(file);
      toast.error('Upload failed, image will be embedded as data URL');
    } finally {
      setUploading(false);
    }
  };

  // ── Ticket type helpers ───────────────────────────────────────────────────

  const updateTicket = (id: string, patch: Partial<TicketType>) =>
    setForm((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    }));

  const addBenefit = (id: string) =>
    updateTicket(id, { benefits: [...(form.ticketTypes.find((t) => t.id === id)?.benefits ?? []), ''] });

  const updateBenefit = (ticketId: string, idx: number, val: string) =>
    updateTicket(ticketId, {
      benefits: (form.ticketTypes.find((t) => t.id === ticketId)?.benefits ?? []).map((b, i) => i === idx ? val : b),
    });

  const removeBenefit = (ticketId: string, idx: number) =>
    updateTicket(ticketId, {
      benefits: (form.ticketTypes.find((t) => t.id === ticketId)?.benefits ?? []).filter((_, i) => i !== idx),
    });

  const handleTicketCountChange = (id: string, newCount: number) => {
    updateTicket(id, { count: Math.max(0, newCount) });
  };

  // Capacity tracking for multi-tier mode
  const usedCapacity = form.ticketTypes.filter((t) => t.isEnabled).reduce((s, t) => s + t.count, 0);
  const remainingCapacity = form.capacity - usedCapacity;

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Auth gate: if the visitor isn't signed in, prompt sign-in instead of
    // hitting the API. Their form state stays intact behind the modal, so
    // they can submit immediately after signing in.
    if (!isAuthenticated) {
      setSignInOpen(true);
      return;
    }

    if (!form.title || form.title.trim().length < 3) {
      toast.error('Event name must be at least 3 characters.');
      return;
    }

    // Backend requires a description (min 10 chars) — enforce it here too so the
    // user gets a clear message instead of a server-side validation error.
    if (!form.description || form.description.trim().length < 10) {
      toast.error('Description must be at least 10 characters.');
      return;
    }

    if (!form.category) {
      toast.error('Please pick a category.');
      return;
    }

    if (!form.country || !form.state || !form.city || !form.address) {
      toast.error('Please complete the event location: country, state, city, and address.');
      return;
    }

    if (!form.pincode.trim()) {
      toast.error('Pincode is required.');
      return;
    }

    const startISO = toISO(form.startDate, form.startTime);
    const endISO   = toISO(form.endDate, form.endTime);

    if (!startISO) { toast.error('Please set a start date.'); return; }
    if (!endISO)   { toast.error('Please set an end date.'); return; }

    const startDt = new Date(startISO);
    const endDt   = new Date(endISO);

    if (startDt <= new Date()) { toast.error('Start date must be in the future.'); return; }
    if (endDt <= startDt)     { toast.error('End date must be after the start date.'); return; }

    if (form.useTicketTypes && usedCapacity > form.capacity) {
      toast.error('Ticket tier seats exceed total capacity.');
      return;
    }

    if (!form.useTicketTypes && form.isPaid && !(Number(form.ticketPrice) > 0)) {
      toast.error('Please enter a ticket price.');
      return;
    }

    const meetingUrl = form.locationType !== 'IN_PERSON' ? (form.meetingUrl || undefined) : undefined;
    const activeTickets = form.useTicketTypes ? form.ticketTypes.filter((t) => t.isEnabled) : undefined;

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      startDate: startISO,
      endDate: endISO,
      type: form.locationType,
      location: {
        address: form.address,
        city: form.city,
        state: getStateName(form.country, form.state),
        country: getCountryName(form.country),
        pincode: form.pincode.trim(),
        meetingUrl,
      },
      coverImage: form.coverImage || undefined,
      theme: form.theme,
      timezone: form.timezone,
      capacity: form.capacity,
      ticketPrice: (!form.useTicketTypes && form.isPaid && form.ticketPrice) ? Number(form.ticketPrice) : undefined,
      ticketTypes: activeTickets,
      requiresApproval: form.requiresApproval,
      waitlistEnabled: form.waitlistEnabled,
      visibility: form.visibility,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      slug: form.slug || undefined,
    };

    try {
      const res = await createMutation.mutateAsync(payload);
      toast.success('Event created!');
      navigate(`/organizer/events/${(res as { data: { id: string } }).data.id}`);
    } catch {
      // Error is already shown by the mutation's onError toast
    }
  };

  // The button stays clickable; handleSubmit toasts the specific error for any
  // missing/invalid field (name, description, category, dates, ticket math) so
  // users always learn what to fix instead of facing a dead disabled button.

  // Inline hint under the submit button — surfaces what's still required so
  // users can see what's left before they even click.
  const missingHints: string[] = [];
  if (form.title.trim().length < 3) missingHints.push('Event name (3+ chars)');
  if (form.description.trim().length < 10) missingHints.push('Description (10+ chars)');
  if (!form.category) missingHints.push('Category');
  if (!form.startDate) missingHints.push('Start date');
  if (!form.endDate) missingHints.push('End date');

  // ── Theme randomizer ──────────────────────────────────────────────────────

  const randomizeTheme = () => {
    const idx = Math.floor(Math.random() * THEME_IDS.length);
    set('theme', THEME_IDS[idx]);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const activeTheme = EVENT_THEMES[form.theme] ?? EVENT_THEMES.indigo;

  return (
    <OrganizerLayout>
      <div className="max-w-[820px] mx-auto pb-12">

        {/* ── Two-column grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-8 items-start">

          {/* ── LEFT: Cover picker + Theme ───────────────────────────────── */}
          <div className="space-y-4">

            {/* Cover image picker — 360×360 square */}
            <Surface>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) void handleFileSelect(file);
                }}
                className="relative w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-muted/10 transition-all overflow-hidden"
                style={(!imagePreview && !form.coverImage) ? { background: activeTheme.bannerGradient } : undefined}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-white/80">Uploading...</p>
                  </div>
                ) : (imagePreview || form.coverImage) ? (
                  <>
                    <img
                      src={imagePreview || form.coverImage}
                      alt="Cover preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); set('coverImage', ''); setImagePreview(''); }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="text-[11px] text-white/70 bg-black/40 rounded px-2 py-0.5">Click to change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-white/80" />
                    <p className="text-sm font-medium text-white/90">Upload cover image</p>
                    <p className="text-xs text-white/60">JPG, PNG, WEBP - max 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); }}
              />
            </Surface>

            {/* Theme picker */}
            <Surface>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">Theme</label>
                <button
                  type="button"
                  onClick={randomizeTheme}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Randomize
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {THEME_IDS.map((id) => {
                  const theme = EVENT_THEMES[id];
                  const isActive = form.theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set('theme', id)}
                      className="flex flex-col items-center gap-1 group"
                      title={theme.label}
                    >
                      <div
                        className={`w-full aspect-square rounded-lg border-2 transition-all relative overflow-hidden ${
                          isActive ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-transparent hover:border-border'
                        }`}
                        style={{ background: theme.bannerGradient }}
                      >
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Surface>
          </div>

          {/* ── RIGHT: Inline edit fields ─────────────────────────────────── */}
          <div className="space-y-5">

            {/* Top row: Calendar dropdown + Visibility toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground cursor-default select-none">
                <Calendar className="w-4 h-4" />
                <span>Personal Calendar</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('visibility', v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.visibility === v
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v === 'PUBLIC' ? 'Public' : 'Private'}
                  </button>
                ))}
              </div>
            </div>

            {/* Event name — clearly labeled input (not a page-title heading) */}
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Event Name</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Enter event name"
                className="text-lg font-semibold h-11"
              />
            </div>

            {/* Date + time rows */}
            <Surface>
              <div className="space-y-3">
                {/* Start */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground block mb-0.5">Start date</label>
                      <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="w-28">
                      <label className="text-[11px] text-muted-foreground block mb-0.5">Start time</label>
                      <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>

                {/* End */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <div className="flex-1">
                      <label className="text-[11px] text-muted-foreground block mb-0.5">End date</label>
                      <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="w-28">
                      <label className="text-[11px] text-muted-foreground block mb-0.5">End time</label>
                      <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <select
                    value={form.timezone}
                    onChange={(e) => set('timezone', e.target.value)}
                    className="flex-1 h-9 px-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Surface>

            {/* Location — expandable */}
            <Surface>
              <button
                type="button"
                onClick={() => setLocationExpanded((v) => !v)}
                className="w-full flex items-center gap-2 text-sm text-left"
              >
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className={locationExpanded ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {form.address ? form.address : 'Add Event Location - In Person'}
                </span>
                <span className="ml-auto text-muted-foreground text-xs">{locationExpanded ? '▲' : '▼'}</span>
              </button>

              {locationExpanded && (
                <div className="mt-3 space-y-2">
                  <div className="px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>In Person</span>
                  </div>

                  <select
                    value={form.country}
                    onChange={(e) => {
                      const country = e.target.value;
                      setForm((prev) => ({ ...prev, country, state: '', city: '' }));
                    }}
                    className="w-full h-9 px-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select country…</option>
                    {countryOptions.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.state}
                      onChange={(e) => {
                        const state = e.target.value;
                        setForm((prev) => ({ ...prev, state, city: '' }));
                      }}
                      disabled={!form.country}
                      className="h-9 px-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">Select state…</option>
                      {stateOptions.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>

                    {cityOptions.length > 0 ? (
                      <select
                        value={form.city}
                        onChange={(e) => set('city', e.target.value)}
                        disabled={!form.state}
                        className="h-9 px-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="">Select city…</option>
                        {cityOptions.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={form.city}
                        onChange={(e) => set('city', e.target.value)}
                        placeholder="City"
                        disabled={!form.state}
                        className="h-9 text-sm disabled:opacity-50"
                      />
                    )}
                  </div>

                  <Input
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="Venue / local address"
                    className="h-9 text-sm"
                  />
                  <Input
                    value={form.pincode}
                    onChange={(e) => set('pincode', e.target.value)}
                    placeholder="Pincode"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </Surface>

            {/* Description — expandable textarea */}
            <Surface>
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="w-full flex items-center gap-2 text-sm text-left"
              >
                <span className={descExpanded ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  {form.description ? form.description.slice(0, 60) + (form.description.length > 60 ? '…' : '') : 'Add Description'}
                </span>
                <span className="ml-auto text-muted-foreground text-xs">{descExpanded ? '▲' : '▼'}</span>
              </button>
              {descExpanded && (
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Tell attendees what to expect..."
                  rows={5}
                  className="mt-3 w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              )}
            </Surface>

            {/* Category — required */}
            <Surface>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-foreground">Category</span>
                <span className="text-xs text-red-500">*</span>
              </div>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a category…</option>
                {['Meetup', 'Workshop', 'Conference', 'Hackathon', 'Fireside', 'Networking', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Surface>

            {/* Event Options section */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Event Options</h2>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Surface>
                <div className="space-y-4">

                  {/* Ticket Price — hidden once multiple ticket tiers are enabled, since each tier sets its own price */}
                  {!form.useTicketTypes && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">Ticket Price</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          {([false, true] as const).map((isPaid) => (
                            <button
                              key={String(isPaid)}
                              type="button"
                              onClick={() => {
                                if (!isPaid) set('ticketPrice', '');
                                set('isPaid', isPaid);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                form.isPaid === isPaid
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'border-border text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {isPaid ? 'Paid' : 'Free'}
                            </button>
                          ))}
                        </div>
                        {form.isPaid && (
                          <Input
                            type="number"
                            min={0}
                            value={form.ticketPrice}
                            onChange={(e) => set('ticketPrice', e.target.value)}
                            placeholder="Price in ₹"
                            className="h-9 text-sm"
                          />
                        )}
                      </div>

                      <div className="h-px bg-border" />
                    </>
                  )}

                  {/* Require Approval */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Require Approval</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set('requiresApproval', !form.requiresApproval)}
                      className={`w-10 h-5 rounded-full relative transition-all flex-shrink-0 ${form.requiresApproval ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.requiresApproval ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  {/* Capacity */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">Capacity</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={form.capacity === 0 ? '' : form.capacity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cap = raw === '' ? 0 : (Number.isFinite(Number.parseInt(raw, 10)) ? Number.parseInt(raw, 10) : 0);
                        set('capacity', cap);
                        if (form.useTicketTypes) {
                          setForm((prev) => ({
                            ...prev,
                            capacity: cap,
                            ticketTypes: allocateTicketSeats(cap, prev.ticketTypes),
                          }));
                          return;
                        }
                      }}
                      placeholder="Unlimited"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="h-px bg-border" />

                  {/* Multiple ticket tiers toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label
                        className="text-sm font-medium text-foreground cursor-pointer select-none"
                        onClick={() => {
                          const next = !form.useTicketTypes;
                          setForm((prev) => ({
                            ...prev,
                            useTicketTypes: next,
                            ticketTypes: next ? allocateTicketSeats(prev.capacity, prev.ticketTypes) : prev.ticketTypes,
                          }));
                        }}
                      >
                        Multiple ticket tiers
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !form.useTicketTypes;
                        setForm((prev) => ({
                          ...prev,
                          useTicketTypes: next,
                          ticketTypes: next ? allocateTicketSeats(prev.capacity, prev.ticketTypes) : prev.ticketTypes,
                        }));
                      }}
                      className={`w-10 h-5 rounded-full relative transition-all flex-shrink-0 ${form.useTicketTypes ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.useTicketTypes ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </Surface>
            </div>

            {/* Multi-tier ticket cards */}
            {form.useTicketTypes && (
              <div className="space-y-3">
                {/* Capacity usage bar */}
                <div className="px-4 py-3 rounded-xl border border-border bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Allocated: <span className="font-semibold text-foreground">{usedCapacity.toLocaleString()}</span> / {form.capacity.toLocaleString()}
                    </span>
                    <span className={remainingCapacity < 0 ? 'text-red-400 font-semibold' : remainingCapacity === 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                      {remainingCapacity < 0
                        ? `⚠ ${Math.abs(remainingCapacity)} over limit`
                        : remainingCapacity === 0
                        ? '✓ Fully allocated'
                        : `${remainingCapacity.toLocaleString()} unallocated`}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${remainingCapacity < 0 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, form.capacity > 0 ? (usedCapacity / form.capacity) * 100 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* Ticket type cards */}
                {form.ticketTypes.map((ticket) => {
                  const otherUsed = form.ticketTypes
                    .filter((t) => t.id !== ticket.id && t.isEnabled)
                    .reduce((s, t) => s + t.count, 0);
                  const maxForThisTier = Math.max(0, form.capacity - otherUsed);

                  return (
                    <div
                      key={ticket.id}
                      className={`rounded-2xl border bg-gradient-to-br p-4 space-y-3 transition-all ${
                        ticket.isEnabled
                          ? TICKET_COLORS[ticket.color] ?? TICKET_COLORS.blue
                          : 'border-border/30 bg-muted/10 opacity-50'
                      }`}
                    >
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateTicket(ticket.id, { isEnabled: !ticket.isEnabled })}
                            className={`w-9 h-5 rounded-full relative transition-all flex-shrink-0 ${ticket.isEnabled ? 'bg-primary' : 'bg-muted'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ticket.isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                          <Input
                            value={ticket.name}
                            onChange={(e) => updateTicket(ticket.id, { name: e.target.value })}
                            className="h-7 text-sm font-semibold bg-transparent border-none focus:ring-0 px-1 w-32"
                            placeholder="Tier name"
                          />
                        </div>
                        <div className="flex gap-1">
                          {Object.keys(TICKET_COLORS).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateTicket(ticket.id, { color: c })}
                              className={`w-4 h-4 rounded-full border-2 transition-all ${ticket.color === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                              style={{ background: c === 'gold' ? '#D4A853' : c === 'silver' ? '#9CA3AF' : c === 'blue' ? '#3B82F6' : c === 'green' ? '#10B981' : '#8B5CF6' }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Price + Count row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Price (₹)</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={ticket.price === 0 ? '' : String(ticket.price)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') { updateTicket(ticket.id, { price: 0 }); return; }
                              const digitsOnly = raw.replace(/[^\d]/g, '');
                              const nextPrice = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
                              updateTicket(ticket.id, { price: nextPrice });
                            }}
                            className="h-8 text-sm"
                            placeholder="0 = free"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Seats</label>
                          <Input
                            type="number"
                            min={0}
                            value={ticket.count === 0 ? '' : ticket.count}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const nextCount = raw === '' ? 0 : (Number.isFinite(Number.parseInt(raw, 10)) ? Number.parseInt(raw, 10) : 0);
                              handleTicketCountChange(ticket.id, nextCount);
                            }}
                            className={`h-8 text-sm ${ticket.isEnabled && ticket.count > maxForThisTier ? 'border-red-400 focus:ring-red-400' : ''}`}
                          />
                          {ticket.isEnabled && ticket.count === maxForThisTier && maxForThisTier > 0 && (
                            <p className="text-[10px] text-amber-400 mt-0.5">At capacity limit</p>
                          )}
                        </div>
                      </div>

                      {/* Benefits */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] text-muted-foreground">Benefits / Inclusions</label>
                          <button
                            type="button"
                            onClick={() => addBenefit(ticket.id)}
                            className="flex items-center gap-0.5 text-[11px] text-primary hover:text-primary/80 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {ticket.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-primary text-xs">✓</span>
                              <Input
                                value={benefit}
                                onChange={(e) => updateBenefit(ticket.id, idx, e.target.value)}
                                className="h-7 text-xs flex-1"
                                placeholder="e.g. VIP seating"
                              />
                              <button type="button" onClick={() => removeBenefit(ticket.id, idx)} className="text-muted-foreground hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {ticket.benefits.length === 0 && (
                            <p className="text-[11px] text-muted-foreground italic">No benefits added yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Submit button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Event'}
            </Button>

            {missingHints.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Still needed: {missingHints.join(' · ')}
              </p>
            )}

          </div>
        </div>
      </div>
      {/* Signed-out gate: pick a path, then sign in. Both steps are locked
          (no dismiss) — auth is required to use this page. */}
      <RoleChoiceModal
        open={gateStep === 'choose'}
        onOpenChange={() => {}}
        onChoose={(role) => setGateStep(role)}
        locked
      />
      <SignInModal
        open={gateStep === 'organizer' || gateStep === 'attendee'}
        onOpenChange={() => {}}
        onBack={() => setGateStep('choose')}
        locked
        roleIntent={gateStep === 'attendee' ? 'attendee' : 'organizer'}
        intendedRoute={gateStep === 'attendee' ? '/dashboard' : '/organizer/events/create'}
        title={gateStep === 'attendee' ? 'Sign in to attend events' : 'Sign in to create your event'}
        description={
          gateStep === 'attendee'
            ? 'Sign in to RSVP, get tickets, and connect at events.'
            : 'Save and publish your event in a moment, sign in with email or Google.'
        }
      />
    </OrganizerLayout>
  );
};

export default CreateEventPage;
