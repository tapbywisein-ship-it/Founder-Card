import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const HOME_BY_ROLE: Record<string, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ArrowRight, ArrowDown, Calendar, Users, ScanLine } from 'lucide-react';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';
import { FeatureBento } from '@/components/FeatureBento';
import { TapCardSection } from '@/components/TapCardSection';
import { RequestDemoModal } from '@/components/RequestDemoModal';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { Button } from '@/components/ui/button';

/* Luma-style accent word — brand-blue gradient on the Instrument Serif display face.
 * Uses the --primary token so it stays on-brand and theme-aware. */
const ACCENT_GRADIENT = 'linear-gradient(100deg, hsl(var(--primary)) 0%, #8AA6FF 100%)';

const LandingPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.user?.role);

  // Signed-in users never see the public landing page — send them to their
  // in-app home.
  if (isAuthenticated) {
    return <Navigate to={HOME_BY_ROLE[role ?? 'attendee'] ?? '/dashboard'} replace />;
  }

  const goCreate = () => navigate('/organizer/events/create');
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ── Hero (light, minimal) ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Soft ambient tint at the top — Luma's understated hero glow. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary)/0.08),transparent)]"
        />
        <div className="relative max-w-content mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mx-auto max-w-3xl font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(2.75rem, 6vw, 5.5rem)', lineHeight: 1.02, letterSpacing: '-0.02em' }}
          >
            Your Network Starts{' '}
            <span
              className="font-serif-display bg-clip-text text-transparent"
              style={{ backgroundImage: ACCENT_GRADIENT }}
            >
              With a Tap.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground"
            style={{ lineHeight: 1.65 }}
          >
            TapByWisein helps founders, professionals, and event attendees instantly exchange
            details, build meaningful connections, and grow their network with NFC-powered smart
            cards.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-4"
          >
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Organizing an event?
              </span>
              <Button size="lg" className="w-full sm:w-auto" onClick={goCreate}>
                Create Event <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Just attending?
              </span>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/discover">
                  Explore events <ArrowDown className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <FeatureBento />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-content mx-auto px-6 py-24">
          <h2 className="text-center font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1 }}>
            Networking in <span className="font-serif-display text-primary">three taps.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base text-muted-foreground" style={{ lineHeight: 1.6 }}>
            No app downloads, no fumbling with business cards. Just tap and connect.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { icon: ScanLine, t: 'Tap or scan', b: "Tap an NFC card or scan a QR to open a founder's card instantly. No app needed." },
              { icon: BadgeCheck, t: 'See their card', b: "Who they are, what they're building, and what they're looking for, at a glance." },
              { icon: Users, t: 'Connect & follow up', b: 'Connect in one tap, then message and follow up after the event.' },
            ].map((s, i) => {
              const solid = i === 0;
              return (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '200px' }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className={`rounded-card p-8 md:p-10 shadow-card-xs transition-transform duration-300 hover:-translate-y-1 ${
                    solid ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
                  }`}
                >
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${solid ? 'bg-white/20' : 'bg-primary/10'}`}>
                    <s.icon className={`h-6 w-6 ${solid ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <p className={`text-lg font-bold ${solid ? 'text-white' : 'text-foreground'}`}>{s.t}</p>
                  <p className={`mt-2 text-sm ${solid ? 'text-white/85' : 'text-muted-foreground'}`} style={{ lineHeight: 1.6 }}>
                    {s.b}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Use cases strip ───────────────────────────────────────────────── */}
      <section className="bg-muted/40 border-y border-border">
        <div className="max-w-content mx-auto px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.05em] mb-5 text-muted-foreground">
            Built for founder meetups, demo days &amp; conferences
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Demo Day', 'Founder Meetup', 'Startup Summit', 'Pitch Night', 'TechConf'].map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Organizer CTA ─────────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-content mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-card border border-border bg-card px-8 py-14 md:px-16 md:py-20 text-center shadow-card">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-5 bg-primary/10">
              <Calendar className="w-6 h-6 text-primary" />
            </span>
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.06 }}>
              Add TapByWisein to your{' '}
              <span
                className="font-serif-display bg-clip-text text-transparent"
                style={{ backgroundImage: ACCENT_GRADIENT }}
              >
                next event.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground" style={{ lineHeight: 1.6 }}>
              2-minute setup. Issue cards, capture connections, and send a recap. No hardware required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={goCreate}>
                Create your first event <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDemoOpen(true)}>
                Request a demo
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── NFC Tap Card story ──────────────────────────────────────────────
          "Your network, one tap away" — problem, product, how it works,
          benefits, use cases, an honest trust note, pricing, and FAQ. ──── */}
      <TapCardSection />

      <PublicFooter />

      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <ExitIntentPopup />
    </div>
  );
};

export default LandingPage;
