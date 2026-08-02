import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const HOME_BY_ROLE: Record<string, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { PublicNav } from '@/components/PublicNav';
import { PublicFooter } from '@/components/PublicFooter';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { Button } from '@/components/ui/button';
import { EASE_PREMIUM } from '@/lib/motion';

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

      <PublicFooter />

      <ExitIntentPopup />
    </div>
  );
};

export default LandingPage;
