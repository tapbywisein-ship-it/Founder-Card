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
import { fadeUp, EASE_PREMIUM } from '@/lib/motion';

/* Luma-style accent word — brand-blue gradient on the Instrument Serif display face.
 * Uses the --primary token so it stays on-brand and theme-aware. */
const ACCENT_GRADIENT = 'linear-gradient(100deg, hsl(var(--primary)) 0%, #9DCAFF 100%)';

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

      {/* ── Hero (split layout: copy left, product photo right) ────────────── */}
      <section className="relative overflow-hidden bg-background">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch lg:min-h-[92vh]">
          {/* Left — copy, vertically centered within the hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_PREMIUM }}
            className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-16 lg:py-0"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4">
              NFC Tap Card
            </p>
            <h1
              className="font-extrabold tracking-tight text-foreground"
              style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Your network{' '}
              <span
                className="font-serif-display bg-clip-text text-transparent"
                style={{ backgroundImage: ACCENT_GRADIENT }}
              >
                starts with a tap.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground" style={{ lineHeight: 1.65 }}>
              TapByWisein helps founders, professionals, and event attendees instantly exchange
              details, build meaningful connections, and grow their network with NFC-powered smart
              cards.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={goCreate}>
                Create Event <ArrowRight className="w-4 h-4" />
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/discover">
                  Explore events <ArrowDown className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right — product photo anchored bottom-right, rising from the base of the hero.
              Empty hand first, then a one-time crossfade to the hand holding the Tap Card —
              plays once on load and stays on the card. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE_PREMIUM }}
            className="relative flex justify-end items-end min-h-[360px] lg:min-h-0 overflow-hidden"
          >
            <div className="relative w-full max-w-[1050px]" style={{ aspectRatio: '2048 / 1168' }}>
              <motion.img
                src="/hero-hand-plain.png"
                alt="Empty hand, about to hold a TapByWisein NFC Tap Card"
                className="absolute inset-0 w-full h-full object-contain object-bottom"
                animate={{ opacity: [1, 1, 0] }}
                transition={{ duration: 3, times: [0, 0.5, 1], ease: 'easeInOut' }}
              />
              <motion.img
                src="/hero-card-glow.png"
                alt="Hand holding a glowing TapByWisein NFC Tap Card"
                className="absolute inset-0 w-full h-full object-contain object-bottom"
                animate={{ opacity: [0, 0, 1] }}
                transition={{ duration: 3, times: [0, 0.5, 1], ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      <FeatureBento />

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-xwide mx-auto px-6 py-24">
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
                  {...fadeUp(i * 0.08)}
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
      <section className="bg-background border-y border-border">
        <motion.div {...fadeUp()} className="max-w-xwide mx-auto px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.05em] mb-5 text-muted-foreground">
            Built for founder meetups, demo days &amp; conferences
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Demo Day', 'Founder Meetup', 'Startup Summit', 'Pitch Night', 'TechConf'].map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                {n}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Organizer CTA ─────────────────────────────────────────────────── */}
      <section className="bg-background">
        <motion.div {...fadeUp()} className="max-w-xwide mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-card border border-border bg-card px-8 py-14 md:px-16 md:py-20 text-center">
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
        </motion.div>
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
