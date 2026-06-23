import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { ProfileCompletionMeter } from '@/components/ProfileCompletionMeter';
import { LiveEventBanner } from '@/components/LiveEventBanner';
import { useAppStore } from '@/store/appStore';
import { Link } from 'react-router-dom';
import { useMyScore } from '@/hooks/useGamification';
import { useMyRegistrations } from '@/hooks/useEvents';
import { useMyProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { useSocket } from '@/lib/socket';
import { profileNeedsOnboarding } from '@/lib/profileCompletion';
import {
  QrCode, Scan, CreditCard, Share2, Calendar, Users,
  Trophy, ChevronRight, Sparkles, Zap, MapPin, ArrowUpRight, Bell,
} from 'lucide-react';

const Counter = ({ to, delay = 0 }: { to: number; delay?: number }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0;
      const step = Math.max(1, to / 50);
      const id = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(id); }
        else setVal(Math.floor(start));
      }, 20);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(timeout);
  }, [to, delay]);
  return <>{val}</>;
};

const AttendeeDashboard = () => {
  const user = useAppStore((s) => s.user);
  useSocket(); // connect socket for real-time notifications

  const { data: gamification } = useMyScore();
  const { data: registrations } = useMyRegistrations();
  const { data: profileData } = useMyProfile();
  const { data: notifData } = useNotifications(1, 5);

  // First-run onboarding: open wizard automatically when the profile is empty
  // and the user hasn't dismissed it before. Auto-shown only once per device.
  const [wizardOpen, setWizardOpen] = useState(false);
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
  const unreadNotifCount = notifData?.unreadCount ?? 0;

  const actions = [
    { icon: Calendar, label: 'Host Event', to: '/organizer/events/create' },
    { icon: Scan, label: 'Scan QR', to: '/connect' },
    { icon: QrCode, label: 'My QR', to: '/connect' },
    { icon: CreditCard, label: 'My Card', to: '/apply-card' },
    { icon: Share2, label: 'Network', to: '/connections' },
  ];

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  });

  return (
    <AppLayout>
      <OnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <div className="space-y-6 pb-28 md:pb-10">

        {/* Live-event banner — only shows when checked into a now-active event */}
        <LiveEventBanner />

        {/* Profile completion nudge — hidden once profile is 100% */}
        <ProfileCompletionMeter onResume={() => setWizardOpen(true)} />

        {/* Greeting */}
        <motion.div {...fade(0)} className="pt-1 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-4xl font-semibold text-foreground">
              Welcome back,{' '}
              <span className="">{user?.name?.split(' ')[0] || 'there'}</span>
            </h1>
          </div>
          {unreadNotifCount > 0 && (
            <Link to="/notifications" className="relative mt-2">
              <Bell className="w-6 h-6 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            </Link>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div {...fade(0.08)} className="grid grid-cols-3 gap-3">
          {[
            { label: 'Registered', value: myEvents.length, delta: 'Events', icon: Calendar },
            { label: 'FK Score', value: score, delta: `Level ${level}`, icon: Trophy, gold: true },
            { label: 'Upcoming', value: upcomingEvents.length, delta: 'Events', icon: Sparkles },
          ].map(({ label, value, delta, icon: Icon, gold }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-3" />
              <p className={`text-3xl font-bold mb-0.5 ${gold ? 'text-primary' : 'text-foreground'}`}>
                <Counter to={value} delay={150} />
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">{delta}</p>
            </Surface>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bento-stagger">

          {/* FK Score Ring */}
          <Surface className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <span className="section-label">FK Score</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                  <motion.circle
                    cx="20" cy="20" r="16"
                    fill="none"
                    stroke="hsl(var(--gold-primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="0 100.5"
                    animate={{ strokeDasharray: `${Math.min(score, 100) * 1.005} 100.5` }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-foreground leading-none">{score}</span>
                  <span className="text-[9px] text-muted-foreground">pts</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-0.5">Level {level}</p>
                <p className="text-xs text-muted-foreground mb-2">FK Score</p>
                <Link to="/gamification">
                  <span className="chip text-[10px]">View Progress</span>
                </Link>
              </div>
            </div>
          </Surface>

          {/* Quick actions */}
          <Surface>
            <span className="section-label block mb-4">Quick Actions</span>
            <div className="grid grid-cols-2 gap-2">
              {actions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl bg-muted/40 hover:bg-secondary transition-colors group"
                >
                  <a.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</span>
                </Link>
              ))}
            </div>
          </Surface>

          {/* Active challenge */}
          <Surface>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="section-label">Challenge</span>
            </div>
            <p className="font-semibold text-foreground mb-1">Attend your first event</p>
            <p className="text-xs text-muted-foreground mb-4">Earn 50 FK points</p>
            <div className="progress-track mb-2">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: myEvents.length > 0 ? '100%' : '0%' }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{myEvents.length > 0 ? 'Completed!' : 'Register for an event'}</span>
              <span className="text-primary font-medium">{myEvents.length > 0 ? '100%' : '0%'}</span>
            </div>
          </Surface>

          {/* Upcoming events */}
          <Surface className="lg:col-span-2">
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
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
                <Button size="sm" className="mt-3" asChild>
                  <Link to="/events">Browse Events</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {upcomingEvents.map((r, i) => (
                  <Link
                    key={r.id}
                    to={`/event/${r.eventId}`}
                    className="p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
                        <MapPin className="w-3 h-3" />
                        {r.event.city}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Surface>

          {/* Discover */}
          <Surface hover>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="section-label">Discover</span>
              </div>
              <Link to="/discover" className="flex items-center gap-0.5 text-[11px] text-primary font-medium hover:underline">
                Explore <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Find events tailored to your interests and connections.</p>
            <div className="grid grid-cols-2 gap-2">
              {['Tech', 'Business', 'Design', 'Startup'].map((cat) => (
                <Link
                  key={cat}
                  to={`/discover?category=${cat.toLowerCase()}`}
                  className="p-2.5 rounded-xl bg-muted/40 hover:bg-secondary transition-colors text-center"
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{cat}</span>
                </Link>
              ))}
            </div>
          </Surface>

        </div>
      </div>
    </AppLayout>
  );
};

export default AttendeeDashboard;
