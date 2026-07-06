import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import { useAppStore } from '@/store/appStore';
import { Link } from 'react-router-dom';
import { useMyScore, useScoreHistory } from '@/hooks/useGamification';
import { useMyRegistrations } from '@/hooks/useEvents';
import { useMyProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { useConnectionSuggestions, useSendConnectionRequest, useConnections } from '@/hooks/useConnections';
import { profileNeedsOnboarding, profileCompletion, hasUploadedAvatar } from '@/lib/profileCompletion';
import { useMyCard } from '@/hooks/useFounderCard';
import { toast } from 'sonner';
import {
  QrCode, Scan, CreditCard, Share2, Calendar, Users,
  Trophy, ChevronRight, Sparkles, Zap, MapPin, ArrowUpRight,
  CheckCircle2, Circle, Camera, Tag, Heart, Target,
  UserPlus, Eye, Award, TrendingUp, Copy, X,
} from 'lucide-react';

/* ─── animated counter ─────────────────────────────────────────────── */
const Counter = ({ to, delay = 0 }: { to: number; delay?: number }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let cur = 0;
      const step = Math.max(1, to / 50);
      const id = setInterval(() => {
        cur += step;
        if (cur >= to) { setVal(to); clearInterval(id); }
        else setVal(Math.floor(cur));
      }, 20);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [to, delay]);
  return <>{val}</>;
};

/* ─── share sheet ───────────────────────────────────────────────────── */
const ShareSheet = ({ cardUrl, onClose }: { cardUrl: string; onClose: () => void }) => {
  const copy = () => {
    navigator.clipboard.writeText(cardUrl);
    toast.success('Link copied!');
  };
  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'My TapByWisein Card', url: cardUrl }).catch(() => {});
    } else {
      copy();
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">Share your card</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
          <p className="text-xs text-muted-foreground truncate flex-1">{cardUrl}</p>
          <button onClick={copy} className="text-primary hover:text-primary/80 shrink-0">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={copy} className="w-full">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy link
          </Button>
          <Button size="sm" onClick={share} className="w-full">
            <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── onboarding checklist ──────────────────────────────────────────── */
const ChecklistItem = ({
  done, label, action, to,
}: { done: boolean; label: string; action: string; to: string }) => (
  <Link to={done ? '#' : to} className={`flex items-center gap-3 py-2 ${done ? 'pointer-events-none' : 'hover:opacity-80'}`}>
    {done
      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    <span className={`text-sm flex-1 ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{label}</span>
    {!done && <span className="text-[11px] text-primary font-medium">{action}</span>}
  </Link>
);

/* ─── score action label map ─────────────────────────────────────────── */
const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  EVENT_REGISTERED:    { label: 'Registered for event', icon: Calendar, color: 'text-blue-500' },
  EVENT_ATTENDED:      { label: 'Attended event', icon: Calendar, color: 'text-emerald-500' },
  CONNECTION_ACCEPTED: { label: 'New connection', icon: UserPlus, color: 'text-primary' },
  QR_SCAN:             { label: 'Scanned a card', icon: QrCode, color: 'text-violet-500' },
  BADGE_EARNED:        { label: 'Earned a badge', icon: Award, color: 'text-amber-500' },
  PROFILE_COMPLETED:   { label: 'Completed profile', icon: CheckCircle2, color: 'text-emerald-500' },
  CARD_VIEWED:         { label: 'Card viewed', icon: Eye, color: 'text-muted-foreground' },
  FIRST_LOGIN:         { label: 'Joined TapByWisein', icon: Sparkles, color: 'text-primary' },
};

/* ─── main page ─────────────────────────────────────────────────────── */
const AttendeeDashboard = () => {
  const user = useAppStore((s) => s.user);
  // Realtime socket is mounted once in AppLayout (the shell this page renders in).

  const { data: gamification } = useMyScore();
  const { data: registrations } = useMyRegistrations();
  const { data: profileData } = useMyProfile();
  const { data: notifData } = useNotifications(1, 5);
  const { data: suggestions } = useConnectionSuggestions(4);
  const { data: connData } = useConnections();
  const { data: historyData } = useScoreHistory(1, 6);
  const { data: card } = useMyCard();
  const sendRequest = useSendConnectionRequest();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileData) return;
    const seen = localStorage.getItem('fk:onboarded') === '1';
    if (!seen && profileNeedsOnboarding(profileData.profile)) {
      setWizardOpen(true);
    }
  }, [profileData]);

  const score = gamification?.fkScore ?? 0;
  const level = gamification?.level ?? 1;
  const myEvents = registrations?.registrations ?? [];
  const upcomingEvents = myEvents
    .filter((r) => r.status === 'REGISTERED' || r.status === 'WAITLISTED')
    .slice(0, 3);

  const profile = profileData?.profile;
  const pct = profileCompletion(profile);

  // Accepted connections — total count (exact, from the paginated meta) + the
  // most recent few for the Dashboard widget.
  const connections = connData?.connections ?? [];
  const connectionCount =
    (connData?.pagination as { total?: number } | undefined)?.total ?? connections.length;
  const recentConnections = connections.slice(0, 4);

  const cardUrl = card?.publicSlug
    ? `${window.location.origin}/c/${card.publicSlug}`
    : `${window.location.origin}/u/${user?.username ?? user?.id}`;

  const handleConnect = useCallback((userId: string) => {
    setSentIds((prev) => new Set(prev).add(userId));
    sendRequest.mutate(userId);
  }, [sendRequest]);

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  /* checklist items */
  const checklistItems = [
    { done: hasUploadedAvatar(profile?.avatar), label: 'Add a profile photo', action: 'Upload', to: '/profile' },
    { done: !!(profile?.bio && profile.bio.length >= 20), label: 'Write a short bio', action: 'Add bio', to: '/profile' },
    { done: !!(profile?.position || profile?.company), label: 'Add your role & company', action: 'Add', to: '/profile' },
    { done: (profile?.skills?.length ?? 0) >= 3, label: 'Add at least 3 skills', action: 'Add skills', to: '/profile' },
    { done: (profile?.interests?.length ?? 0) >= 2, label: 'Add interests', action: 'Add', to: '/profile' },
    { done: (profile?.lookingFor?.length ?? 0) >= 1, label: 'Add what you\'re looking for', action: 'Add', to: '/profile' },
    { done: !!(profile?.linkedin || profile?.twitter || profile?.website), label: 'Link a social profile', action: 'Connect', to: '/profile' },
    { done: myEvents.length > 0, label: 'Register for an event', action: 'Browse', to: '/events' },
  ];
  const completedSteps = checklistItems.filter((i) => i.done).length;
  const nextStep = checklistItems.find((i) => !i.done);

  const actions = [
    { icon: Scan, label: 'Scan QR', to: '/connect' },
    { icon: QrCode, label: 'My QR', to: '/connect' },
    { icon: CreditCard, label: 'My Card', to: '/apply-card' },
    { icon: Users, label: 'Network', to: '/connections' },
    { icon: Calendar, label: 'Events', to: '/events' },
  ];

  return (
    <AppLayout>
      <OnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <AnimatePresence>
        {shareOpen && <ShareSheet cardUrl={cardUrl} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      <div className="space-y-6 pb-28 md:pb-10">
        <LiveEventBanner />

        {/* Greeting */}
        <motion.div {...fade(0)} className="pt-1 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-4xl font-semibold text-foreground">
              Welcome back, {user?.name?.split(' ')[0] || 'there'}
            </h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 shrink-0 gap-1.5"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="w-3.5 h-3.5" /> Share Card
          </Button>
        </motion.div>

        {/* Stats row */}
        <motion.div {...fade(0.06)} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Registered', value: myEvents.length, sub: 'Events', icon: Calendar },
            { label: 'FK Score', value: score, sub: `Level ${level}`, icon: Trophy, gold: true },
            { label: 'Connections', value: connectionCount, sub: 'People', icon: Users },
            { label: 'Upcoming', value: upcomingEvents.length, sub: 'Events', icon: Sparkles },
          ].map(({ label, value, sub, icon: Icon, gold }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-3" />
              <p className={`text-3xl font-bold mb-0.5 ${gold ? 'text-primary' : 'text-foreground'}`}>
                <Counter to={value} delay={150} />
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">{sub}</p>
            </Surface>
          ))}
        </motion.div>

        {/* Main bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* ── Profile Checklist ── */}
          {pct < 100 && (
            <motion.div {...fade(0.08)} className="lg:col-span-1">
              <Surface className="h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <span className="section-label">Profile Setup</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{completedSteps}/{checklistItems.length}</span>
                </div>

                {/* progress bar */}
                <div className="progress-track mb-4">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div className="divide-y divide-border">
                  {checklistItems.slice(0, 4).map((item) => (
                    <ChecklistItem key={item.label} {...item} />
                  ))}
                </div>

                {nextStep && (
                  <Button size="sm" className="w-full mt-3" asChild>
                    <Link to={nextStep.to}>{nextStep.action} →</Link>
                  </Button>
                )}
              </Surface>
            </motion.div>
          )}

          {/* ── FK Score Ring + Recent Activity ── */}
          <motion.div {...fade(0.1)} className="lg:col-span-1">
            <Surface className="h-full">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <span className="section-label">FK Score</span>
                <Link to="/gamification" className="ml-auto text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                  Details <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                    <motion.circle
                      cx="20" cy="20" r="16" fill="none"
                      stroke="hsl(var(--gold-primary, var(--primary)))"
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray="0 100.5"
                      animate={{ strokeDasharray: `${Math.min(score, 100) * 1.005} 100.5` }}
                      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground leading-none">{score}</span>
                    <span className="text-[9px] text-muted-foreground">pts</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Level {level}</p>
                  <p className="text-xs text-muted-foreground">FK Score</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      { label: '+50 Attend event', done: myEvents.some((r) => r.status === 'ATTENDED' || r.checkedIn) },
                      { label: '+20 Connect', done: false },
                    ].map((hint) => (
                      <span key={hint.label} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${hint.done ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-muted/40 border-border text-muted-foreground'}`}>
                        {hint.done ? '✓' : ''} {hint.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent score activity */}
              {historyData && historyData.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Recent</p>
                  {historyData.slice(0, 3).map((h: { id: string; action: string; points: number; createdAt: string }) => {
                    const meta = ACTION_LABELS[h.action] ?? { label: h.action, icon: TrendingUp, color: 'text-muted-foreground' };
                    const Icon = meta.icon;
                    return (
                      <div key={h.id} className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${meta.color}`} />
                        <span className="text-xs text-foreground flex-1 truncate">{meta.label}</span>
                        <span className="text-xs font-semibold text-primary">+{h.points}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>

          {/* ── Quick Actions ── */}
          <motion.div {...fade(0.12)}>
            <Surface className="h-full">
              <span className="section-label block mb-4">Quick Actions</span>
              <div className="grid grid-cols-3 gap-2">
                {actions.map((a) => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/40 hover:bg-secondary transition-colors group"
                  >
                    <a.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{a.label}</span>
                  </Link>
                ))}
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors group"
                >
                  <Share2 className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-medium text-primary text-center leading-tight">Share Card</span>
                </button>
              </div>
            </Surface>
          </motion.div>

          {/* ── Upcoming Events ── */}
          <motion.div {...fade(0.14)} className="md:col-span-2 lg:col-span-2">
            <Surface className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="section-label">My Upcoming Events</span>
                </div>
                <Link to="/events" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
                  Browse all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No upcoming events</p>
                    <p className="text-xs text-muted-foreground mt-1">Discover founder events happening near you</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Tech', 'Startup', 'Design', 'Business'].map((cat) => (
                      <Link
                        key={cat}
                        to={`/discover?category=${cat.toLowerCase()}`}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {cat}
                      </Link>
                    ))}
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/events">Browse Events</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {upcomingEvents.map((r) => (
                    <Link
                      key={r.id}
                      to={`/event/${r.eventId}`}
                      className="p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'WAITLISTED' ? 'bg-amber-500' : 'bg-primary'}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.status === 'WAITLISTED' ? 'Waitlisted' : 'Registered'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug mb-1 truncate">
                        {r.event?.title ?? 'Event'}
                      </p>
                      {r.event?.startDate && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(r.event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                      {r.event?.city && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {r.event.city}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </Surface>
          </motion.div>

          {/* ── Recent Connections ── */}
          {recentConnections.length > 0 && (
            <motion.div {...fade(0.15)} className="md:col-span-2 lg:col-span-3">
              <Surface>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="section-label">Recent Connections</span>
                    <span className="text-[11px] text-muted-foreground">({connectionCount})</span>
                  </div>
                  <Link to="/connections" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recentConnections.map((c) => {
                    const p = c.user?.profile;
                    const name = p ? `${p.firstName} ${p.lastName}`.trim() : c.user?.email ?? 'User';
                    return (
                      <Link
                        key={c.id}
                        to={c.user?.id ? `/card/${c.user.id}` : '/connections'}
                        className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                      >
                        {p?.avatar ? (
                          <img src={p.avatar} alt={name} loading="lazy" className="w-12 h-12 rounded-full object-cover mb-2" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold mb-2">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm font-semibold text-foreground leading-tight mb-0.5 truncate w-full">{name}</p>
                        {(p?.position || p?.company) && (
                          <p className="text-[11px] text-muted-foreground truncate w-full mb-1">
                            {[p?.position, p?.company].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {c.createdAt && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Connected {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                        <span className="mt-2 text-[11px] font-medium text-primary">View Profile</span>
                      </Link>
                    );
                  })}
                </div>
              </Surface>
            </motion.div>
          )}

          {/* ── People You May Know ── */}
          {suggestions && suggestions.length > 0 && (
            <motion.div {...fade(0.16)} className="md:col-span-2 lg:col-span-3">
              <Surface>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                    <span className="section-label">People You May Know</span>
                  </div>
                  <Link to="/discover" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
                    See more <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {suggestions.map((s) => {
                    const p = s.profile;
                    const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'User';
                    const sent = sentIds.has(s.id);
                    return (
                      <div key={s.id} className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                        {p?.avatar ? (
                          <img src={p.avatar} alt={name} loading="lazy" className="w-12 h-12 rounded-full object-cover mb-2" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold mb-2">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm font-semibold text-foreground leading-tight mb-0.5 truncate w-full">{name}</p>
                        {(p?.position || p?.company) && (
                          <p className="text-[11px] text-muted-foreground truncate w-full mb-2">
                            {[p?.position, p?.company].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {p?.skills && p.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center mb-2">
                            {p.skills.slice(0, 2).map((sk) => (
                              <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{sk}</span>
                            ))}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant={sent ? 'outline' : 'default'}
                          className="w-full text-xs h-7"
                          disabled={sent || sendRequest.isPending}
                          onClick={() => handleConnect(s.id)}
                        >
                          {sent ? 'Sent ✓' : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Surface>
            </motion.div>
          )}

          {/* ── Discover ── */}
          <motion.div {...fade(0.18)}>
            <Surface hover className="h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="section-label">Discover</span>
                </div>
                <Link to="/discover" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
                  Explore <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Events tailored to your interests.</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tech', icon: '💻' },
                  { label: 'Business', icon: '📈' },
                  { label: 'Design', icon: '🎨' },
                  { label: 'Startup', icon: '🚀' },
                ].map(({ label, icon }) => (
                  <Link
                    key={label}
                    to={`/discover?category=${label.toLowerCase()}`}
                    className="p-2.5 rounded-xl bg-muted/40 hover:bg-secondary transition-colors text-center"
                  >
                    <span className="text-base">{icon}</span>
                    <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
                  </Link>
                ))}
              </div>
            </Surface>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
};

export default AttendeeDashboard;
