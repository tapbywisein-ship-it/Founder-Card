import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  Calendar, MapPin, Globe, ExternalLink, Users, CheckCircle2,
  Clock, Share2, Tag, QrCode, ArrowLeft,
} from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Logo } from '@/components/Logo';
import { EventSpeakersAgenda } from '@/components/EventSpeakersAgenda';
import { ReportButton } from '@/components/ReportButton';
import { AddToCalendar } from '@/components/AddToCalendar';
import { requireVerifiedEmail } from '@/components/VerifyEmailBanner';
import { eventsService } from '@/services/events.service';
import { useAppStore } from '@/store/appStore';
import { ApiError } from '@/services/api';
import {
  useEvent, useRegisterForEvent, useCancelRegistration, useMyRegistrations, useEventAttendees,
} from '@/hooks/useEvents';
import { useQueryClient } from '@tanstack/react-query';
import { injectThemeVars } from '@/lib/eventThemes';
import { useJsonLd } from '@/lib/useJsonLd';
import { useSeo } from '@/lib/useSeo';
import { getRegistrationPricing } from '@/lib/ticketPricing';
import { formatINR } from '@/lib/currency';
import { paymentsService, loadRazorpayScript, openRazorpayCheckout } from '@/services/payments.service';
import { useHomePath } from '@/lib/useHomePath';

/**
 * Unified event detail page rendered by both `/event/:id` (auth) and
 * `/e/:id` (public shareable). Layout chrome is chosen by auth state:
 * authenticated visitors get the full PortalLayout (top nav, side menu);
 * public visitors get a minimal `PublicNav` so the page is shareable.
 *
 * Body is the same Luma-style 820px single column for both modes:
 * cover → host → title → date-tile + location → register → about → tags.
 */
const EventDetailUnified = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Signed-in users on the public `/e/:slug` URL should be bounced to the
  // in-app `/event/:id` so they get the full app chrome instead of the
  // public-share minimal nav.
  useEffect(() => {
    if (isAuthenticated && id && window.location.pathname.startsWith('/e/')) {
      navigate(`/event/${id}`, { replace: true });
    }
  }, [isAuthenticated, id, navigate]);

  const { data: event, isLoading } = useEvent(id!);
  const { data: myRegsData } = useMyRegistrations();
  const registerMutation = useRegisterForEvent();
  const cancelMutation = useCancelRegistration();
  const queryClient = useQueryClient();
  const { data: attendeesData } = useEventAttendees(id ?? '', !!id);

  const myRegistration = (myRegsData?.registrations ?? []).find(
    (r) => r.eventId === id
  );

  // All hooks MUST run on every render — hoist above the early returns.
  // Previously useState(guestRsvpOpen) lived below the loading/not-found
  // early returns, which produced "rendered more hooks than during the
  // previous render" once the data loaded.
  const [guestRsvpOpen, setGuestRsvpOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [paying, setPaying] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPct: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  // Fire a page-view beacon once per mount. Idempotent server-side per session.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';
    fetch(`${API_URL}/events/${id}/view`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (containerRef.current && event) {
      injectThemeVars(containerRef.current, event.theme);
    }
  }, [event]);

  // Schema.org Event structured data for crawlers (client-side, on the real route).
  useJsonLd(
    event
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: event.title,
          description: (event.description ?? '').slice(0, 500),
          startDate: event.startDate,
          endDate: event.endDate,
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode:
            event.locationType === 'VIRTUAL'
              ? 'https://schema.org/OnlineEventAttendanceMode'
              : 'https://schema.org/OfflineEventAttendanceMode',
          location:
            event.locationType === 'VIRTUAL'
              ? { '@type': 'VirtualLocation', url: typeof window !== 'undefined' ? window.location.href : '' }
              : {
                  '@type': 'Place',
                  name: [event.address, event.city, event.country].filter(Boolean).join(', ') || 'TBD',
                },
          organizer: {
            '@type': 'Organization',
            name: event.organizer?.profile
              ? `${event.organizer.profile.firstName} ${event.organizer.profile.lastName}`.trim()
              : 'TapByWisein',
          },
        }
      : null
  );

  // Per-route SEO meta (title / description / canonical / OG).
  useSeo(
    event
      ? {
          title: event.title,
          description:
            (event.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
            `${event.title} — a networking event on TapByWisein.`,
          canonical: `/e/${event.slug ?? event.id}`,
          image: event.coverImage ?? undefined,
          type: 'article',
        }
      : {}
  );

  const wrap = (children: ReactNode) =>
    isAuthenticated ? (
      <PortalLayout>{children}</PortalLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <PublicNav eventId={id} />
        <main className="max-w-content mx-auto px-4 py-6 md:py-10">
          {children}
        </main>
      </div>
    );

  // ── Loading skeleton ────────────────────────────────────────────────
  if (isLoading) {
    return wrap(
      <div className="space-y-4 animate-pulse">
        <div className="aspect-[16/9] rounded-card bg-muted" />
        <div className="h-8 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (!event) {
    return wrap(
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">This event could not be found.</p>
        <Button asChild>
          <Link to={isAuthenticated ? '/events' : '/'}>
            {isAuthenticated ? 'Back to events' : 'Go home'}
          </Link>
        </Button>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isPast = endDate < new Date();
  const isFull = (event.registeredCount ?? 0) >= event.capacity;
  const spotsLeft = event.capacity - (event.registeredCount ?? 0);
  const { topLabel: price, tiers } = getRegistrationPricing(event);

  // ── Paid-ticket logic ────────────────────────────────────────────────
  const paidTiers = tiers.filter((t) => t.price > 0);
  const singlePrice = event.ticketPrice == null ? 0 : Number(event.ticketPrice);
  // Payable tiers: explicit paid tiers, or a synthetic "General Admission" for
  // single-price events (id 'default' matches the backend resolver).
  const payableTiers =
    paidTiers.length > 0
      ? paidTiers
      : singlePrice > 0
        ? [{ id: 'default', name: 'General Admission', price: singlePrice, priceLabel: formatINR(singlePrice), seats: event.capacity }]
        : [];
  const hasFreeTier = tiers.length > 0 ? tiers.some((t) => t.price <= 0) : singlePrice <= 0;
  const requiresPayment = !hasFreeTier && payableTiers.length > 0;
  const isTierSoldOut = (t: { id: string; seats: number }) =>
    t.seats > 0 && (event.soldByTier?.[t.id] ?? 0) >= t.seats;
  const availableTiers = payableTiers.filter((t) => !isTierSoldOut(t));
  const effectiveTierId = selectedTierId || availableTiers[0]?.id || payableTiers[0]?.id || '';
  const effectiveTier = payableTiers.find((t) => t.id === effectiveTierId) ?? payableTiers[0];
  const allTiersSoldOut = requiresPayment && availableTiers.length === 0;

  const isRegistered =
    event.registrationStatus === 'REGISTERED' ||
    event.registrationStatus === 'ATTENDED' ||
    (event.registrationStatus == null &&
      (myRegistration?.status === 'REGISTERED' ||
        myRegistration?.status === 'ATTENDED'));
  const isWaitlisted =
    event.registrationStatus === 'WAITLISTED' ||
    (event.registrationStatus == null && myRegistration?.status === 'WAITLISTED');

  const monthLabel = startDate
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase();
  const dayLabel = startDate.getDate();

  const organizerName = event.organizer?.profile
    ? `${event.organizer.profile.firstName} ${event.organizer.profile.lastName}`.trim()
    : event.organizer?.email ?? 'Organizer';
  const organizerCompany = event.organizer?.profile?.company;
  const organizerAvatar = event.organizer?.profile?.avatar;

  const qrValue = myRegistration?.id
    ? `reg:${myRegistration.id}`
    : `tapbywisein://event/${event.id}/user/${user?.id ?? 'guest'}`;

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleRegister = () => {
    // Soft email-verification gate for signed-in users.
    if (isAuthenticated && !requireVerifiedEmail(user)) return;
    // Paid events go through Razorpay checkout (requires an account).
    if (requiresPayment) {
      if (!isAuthenticated) {
        navigate('/login', { state: { from: { pathname: `/e/${id}` } } });
        return;
      }
      void handleBuyTicket();
      return;
    }
    // Luma-style: unauthenticated users RSVP via name+email modal — no signup
    // detour. Backend silently finds-or-creates the user keyed by email.
    if (!isAuthenticated) {
      setGuestRsvpOpen(true);
      return;
    }
    registerMutation.mutate({ eventId: event.id });
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || !effectiveTier) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const { data } = await paymentsService.validateCoupon(event.id, code);
      setCouponApplied({ code: data.code, discountPct: data.discountPct });
      toast.success(`${data.discountPct}% off applied`);
    } catch (err) {
      setCouponApplied(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon');
    } finally {
      setCouponChecking(false);
    }
  };

  const clearCoupon = () => {
    setCouponApplied(null);
    setCouponInput('');
    setCouponError(null);
  };

  // Discounted price for display; the backend re-validates + recomputes the charge.
  const discountedPrice =
    effectiveTier && couponApplied
      ? Math.round(effectiveTier.price * (1 - couponApplied.discountPct / 100) * 100) / 100
      : effectiveTier?.price;

  const handleBuyTicket = async () => {
    if (!effectiveTier) return;
    setPaying(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error('Could not load the payment window. Check your connection.');
        return;
      }
      const { data: order } = await paymentsService.createOrder(
        event.id,
        effectiveTier.id,
        couponApplied?.code
      );
      openRazorpayCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.eventTitle,
        description: `Ticket · ${order.ticketTierName}`,
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0f172a' },
        modal: { ondismiss: () => setPaying(false) },
        handler: (resp) => {
          void (async () => {
            try {
              await paymentsService.verify({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              await queryClient.invalidateQueries({ queryKey: ['events'] });
              toast.success('Payment successful, you\'re registered!');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Payment verification failed');
            } finally {
              setPaying(false);
            }
          })();
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        toast.error('Online payments aren\'t enabled yet. Please contact the organizer.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not start payment');
      }
      setPaying(false);
    }
  };

  const handleShare = () => {
    // Prefer the human-friendly slug URL for sharing on WhatsApp/LinkedIn.
    const url = `${window.location.origin}/e/${event.slug ?? event.id}`;
    if (navigator.share) {
      navigator.share({ title: event.title, url }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Link copied'))
        .catch(() => toast.error('Could not copy'));
    }
  };

  // ── Page body ────────────────────────────────────────────────────────
  return wrap(
    <div ref={containerRef} data-event-theme={event.theme}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-6 max-w-content mx-auto"
      >
        {/* Back link (auth users only — public users get nav) */}
        {isAuthenticated && (
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All events
          </Link>
        )}

        {/* Cover */}
        <div className="aspect-[16/9] rounded-card overflow-hidden border border-border">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(135deg, var(--event-accent, hsl(var(--primary))) 0%, hsl(var(--primary)) 100%)',
              }}
              aria-hidden
            />
          )}
        </div>

        {/* Host row */}
        <div className="flex items-center gap-3">
          {organizerAvatar ? (
            <img
              src={organizerAvatar}
              alt={organizerName}
              className="w-10 h-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-semibold text-foreground">
              {organizerName[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Hosted by</p>
            <p className="text-sm font-medium text-foreground truncate">
              {organizerName}
              {organizerCompany ? (
                <span className="text-muted-foreground"> · {organizerCompany}</span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Title + category */}
        <div>
          {event.category && (
            <span className="chip-primary mb-2 inline-flex">{event.category}</span>
          )}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground leading-tight">
            {event.title}
          </h1>
        </div>

        {/* Date-tile + time + location */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 rounded-md border border-border overflow-hidden text-center">
              <div className="bg-accent text-primary text-[10px] font-bold uppercase py-0.5">
                {monthLabel}
              </div>
              <div className="text-foreground font-mono text-xl font-semibold py-1 leading-none">
                {dayLabel}
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">
                {startDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {startDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                –{' '}
                {endDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {event.timezone && event.timezone !== 'UTC'
                  ? ` (${event.timezone})`
                  : ''}
              </p>
            </div>
          </div>

          {event.locationType !== 'VIRTUAL' && (event.address || event.city) ? (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {event.address || event.city}
                </p>
                {event.address && event.city && (
                  <p className="text-sm text-muted-foreground">
                    {[event.city, event.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          ) : event.locationType !== 'IN_PERSON' ? (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-md border border-border bg-muted flex items-center justify-center">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Online event</p>
                {isRegistered && event.meetingUrl ? (
                  <a
                    href={event.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Join meeting <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Register to receive the join link
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Registration card */}
        <Surface elevated>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Registration
            </span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {price}
            </span>
          </div>

          {tiers.length > 0 && !requiresPayment && (
            <div className="space-y-1 mb-3">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{t.name}</span>
                  <span className="font-medium text-foreground">{t.priceLabel}</span>
                </div>
              ))}
            </div>
          )}

          {/* Paid events: selectable ticket tiers (with per-tier sold-out) */}
          {requiresPayment && payableTiers.length > 0 && !isRegistered && !isPast && (
            <div className="space-y-2 mb-3">
              {payableTiers.map((t) => {
                const sold = event.soldByTier?.[t.id] ?? 0;
                const soldOut = t.seats > 0 && sold >= t.seats;
                const selected = t.id === effectiveTierId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => !soldOut && setSelectedTierId(t.id)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                      soldOut
                        ? 'border-border opacity-60 cursor-not-allowed'
                        : selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-3.5 w-3.5 rounded-full border ${selected && !soldOut ? 'border-primary bg-primary' : 'border-muted-foreground'}`}
                      />
                      <span className="text-foreground">{t.name}</span>
                    </span>
                    {soldOut ? (
                      <span className="text-xs font-semibold text-rose-600">Sold out</span>
                    ) : (
                      <span className="font-semibold text-foreground">{t.priceLabel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {event.registeredCount ?? 0} registered
              </span>
              <span>{event.capacity} capacity</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    ((event.registeredCount ?? 0) / event.capacity) * 100
                  )}%`,
                }}
              />
            </div>
            {!isFull && spotsLeft > 0 && spotsLeft <= 20 && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Only {spotsLeft} spots left
              </p>
            )}
          </div>

          {/* Status / action button */}
          {isPast ? (
            <Surface padding="sm">
              <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Past event
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This event has already ended.
              </p>
            </Surface>
          ) : event.status !== 'PUBLISHED' ? (
            <Button className="w-full" size="lg" disabled>
              Event unavailable
            </Button>
          ) : isRegistered ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-3 rounded-md bg-success/10 border border-success/30">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">
                  You're registered
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => cancelMutation.mutate(event.id)}
                disabled={cancelMutation.isPending}
              >
                Cancel registration
              </Button>
            </div>
          ) : isWaitlisted ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-md bg-amber-500/10 border border-amber-500/30">
              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                You're on the waitlist
              </span>
            </div>
          ) : isFull && !event.waitlistEnabled ? (
            <Button className="w-full" size="lg" disabled>
              Event full
            </Button>
          ) : !isAuthenticated ? (
            <Button className="w-full" size="lg" onClick={handleRegister}>
              Sign in to register
            </Button>
          ) : user?.role !== 'attendee' ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              Sign in as an Attendee to register for events.
            </p>
          ) : requiresPayment ? (
            <div className="space-y-2">
              {/* Coupon */}
              {couponApplied ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                  <span className="text-emerald-600">
                    Coupon <span className="font-semibold">{couponApplied.code}</span> — {couponApplied.discountPct}% off
                  </span>
                  <button type="button" onClick={clearCoupon} className="text-xs text-muted-foreground hover:text-foreground underline">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                    placeholder="Coupon code"
                    className="h-10 uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={applyCoupon}
                    disabled={couponChecking || !couponInput.trim()}
                  >
                    {couponChecking ? '…' : 'Apply'}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}

              <Button
                className="w-full"
                size="lg"
                onClick={handleRegister}
                disabled={paying || isFull || allTiersSoldOut}
              >
                {paying
                  ? 'Processing…'
                  : allTiersSoldOut
                    ? 'Sold out'
                    : isFull
                      ? 'Event full'
                      : couponApplied && discountedPrice !== undefined
                        ? `Buy ticket - ${formatINR(discountedPrice)}`
                        : `Buy ticket - ${effectiveTier?.priceLabel ?? price}`}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              onClick={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? 'Registering…'
                : isFull
                  ? 'Join waitlist'
                  : 'Register'}
            </Button>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="w-3.5 h-3.5" /> Share event
            </Button>
            <AddToCalendar
              event={{
                title: event.title,
                description: event.description ?? undefined,
                start: event.startDate,
                end: event.endDate,
                location:
                  event.locationType === 'VIRTUAL'
                    ? event.meetingUrl ?? 'Online'
                    : [event.address, event.city, event.country].filter(Boolean).join(', ') || undefined,
                url: `${window.location.origin}/e/${event.id}`,
              }}
            />
            {isAuthenticated && (
              <ReportButton
                targetType="EVENT"
                targetId={event.id}
                targetLabel={event.title}
                triggerClass="h-9 w-9 border border-border"
              />
            )}
          </div>
        </Surface>

        {/* QR ticket if registered */}
        {isRegistered && (
          <Surface>
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Your entry ticket
              </h2>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-md border border-border">
                <QRCodeSVG
                  value={qrValue}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#181a1f"
                  level="M"
                />
              </div>
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Registered</span>
                </div>
                <p className="text-xs text-muted-foreground">{event.title}</p>
                {myRegistration?.id && (
                  <p className="text-[11px] text-muted-foreground font-mono">
                    ID: {myRegistration.id.slice(0, 8)}…
                  </p>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Show this QR at the entrance for check-in.
                </p>
              </div>
            </div>
          </Surface>
        )}

        {/* About */}
        <Surface>
          <h2 className="text-base font-semibold text-foreground mb-2">
            About this event
          </h2>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        </Surface>

        {/* Phase 5 — Speakers + Agenda */}
        <EventSpeakersAgenda eventId={event.id} />

        {/* Who's coming + social proof */}
        {(attendeesData?.attendees?.length ?? 0) > 0 && (
          <Surface>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Who's coming</h2>
              {(event.connectionsCount ?? 0) > 0 && (
                <span className="text-xs font-medium text-primary">
                  {event.connectionsCount} {event.connectionsCount === 1 ? 'connection' : 'connections'} made here
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {attendeesData!.attendees.slice(0, 18).map((a) => {
                const name = a.user.profile
                  ? `${a.user.profile.firstName} ${a.user.profile.lastName}`.trim()
                  : 'Founder';
                return (
                  <div
                    key={a.userId}
                    title={name}
                    className="h-10 w-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center text-xs font-semibold text-foreground border border-border"
                  >
                    {a.user.profile?.avatar ? (
                      <img src={a.user.profile.avatar} alt={name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                );
              })}
              {attendeesData!.attendees.length > 18 && (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border">
                  +{attendeesData!.attendees.length - 18}
                </div>
              )}
            </div>
          </Surface>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span key={tag} className="chip">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Guest RSVP modal — opens for unauthenticated users who click Register */}
      <GuestRsvpModal
        open={guestRsvpOpen}
        onOpenChange={setGuestRsvpOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  );
};

// ─── Guest RSVP modal ──────────────────────────────────────────────────────
interface GuestRsvpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const GuestRsvpModal = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: GuestRsvpModalProps) => {
  const navigate = useNavigate();
  const homePath = useHomePath();
  const login = useAppStore((s) => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  // True when the email is a claimed (password-protected) account — backend
  // declined to auto-sign-in and we should send them to /login instead.
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setDone(false);
    setDoneMessage('');
    setRequiresSignIn(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email) return;
    setLoading(true);
    try {
      // Backend silently finds-or-creates the user. If the email isn't
      // already a password-protected account, it also returns auth tokens
      // and we auto-sign-in (Luma flow). If it IS claimed, we just confirm
      // the RSVP and prompt the visitor to sign in normally.
      const res = await eventsService.rsvpAsGuest(eventId, {
        name: name.trim(),
        email,
      });
      if (res.user && res.tokens) {
        login(res.user);
      }
      setRequiresSignIn(res.requiresSignIn);
      setDoneMessage(res.message);
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not RSVP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {!done ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Register for this event
              </DialogTitle>
              <DialogDescription>
                Enter your name and email. We'll send you a confirmation.
                {' '}If you already have an account, your RSVP will attach to it.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="rsvp-name">Full name</Label>
                <Input
                  id="rsvp-name"
                  type="text"
                  placeholder="Alex Chen"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rsvp-email">Email</Label>
                <Input
                  id="rsvp-email"
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !name.trim() || !email}
              >
                {loading ? 'Confirming…' : 'One-Click RSVP'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By RSVPing, you agree to our Terms and Privacy Policy.
              </p>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold inline-flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                You're in!
              </DialogTitle>
              <DialogDescription>
                {doneMessage} for <strong>{eventTitle}</strong>. We sent a
                confirmation to <strong>{email}</strong>.
                {requiresSignIn
                  ? ' This email already has an account. Sign in to manage your tickets.'
                  : ' You can jump straight to your dashboard to see all your upcoming events.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {requiresSignIn ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    reset();
                    navigate('/login');
                  }}
                >
                  Sign in
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    reset();
                    navigate(homePath);
                  }}
                >
                  View your dashboard
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                Stay on this event
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Minimal navbar shown on the public `/e/:id` route. */
function PublicNav({ eventId }: { eventId?: string }) {
  const { isAuthenticated, user } = useAppStore();
  const dashPath =
    user?.role === 'organizer'
      ? '/organizer/dashboard'
      : user?.role === 'admin'
        ? '/admin/dashboard'
        : '/dashboard';
  const loginState = eventId ? { from: { pathname: `/e/${eventId}` } } : undefined;

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-content mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={dashPath}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" state={loginState}>
                  Sign in
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/login">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default EventDetailUnified;
