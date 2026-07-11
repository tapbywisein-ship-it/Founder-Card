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
import { LandingNav } from '@/components/LandingNav';
import { FeatureBento } from '@/components/FeatureBento';
import { TapCardSection } from '@/components/TapCardSection';
import { ParticleWordmark } from '@/components/ParticleWordmark';
import { RequestDemoModal } from '@/components/RequestDemoModal';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';

/* ── Design tokens (scoped to the marketing page) ──────────────────────────── */
const NAVY = 'radial-gradient(130% 100% at 12% -10%, #161F5C 0%, #0A0E2E 42%, #050612 100%)';
const ACCENT = '#4C7BFF';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #7C9BFF 0%, #4C7BFF 55%, #2A48B8 100%)';
const GOLD = '#D8B675';
const TINT = '#EEF2FF';
const TEXT_DIM = '#A7AFCE';

/* Pill buttons — fully rounded, premium gradient fills. Compact on mobile so two fit in one row, generous padding from sm: up. */
const btnPrimary =
  'group relative inline-flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden rounded-full px-5 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-white shadow-[0_12px_40px_-10px_rgba(76,123,255,0.65)] ring-1 ring-white/15 transition-transform duration-200 hover:scale-[1.02]';
const btnGhostDark =
  'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-medium text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/10 hover:border-white/25';
const btnSolidLight =
  'inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-white px-5 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-semibold text-[#0A0A0A] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.02]';


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
    <div className="min-h-screen" style={{ background: '#050612' }}>
      <LandingNav />

      {/* ── Hero (video background + grain) ───────────────────────────────── */}
      <section className="bg-grain relative overflow-hidden pt-16 min-h-screen min-h-[100dvh]" style={{ background: NAVY }}>
        {/* Ambient video background */}
        <video
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/commercial-ad.webm" type="video/webm" />
          <source src="/commercial-ad.mp4" type="video/mp4" />
        </video>
        {/* Readability scrim — darker over the copy, lighter toward the preview card */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(100deg, rgba(5,6,18,0.93) 0%, rgba(5,6,18,0.8) 45%, rgba(5,6,18,0.55) 100%)' }}
        />
        <div className="relative max-w-xwide mx-auto px-6 flex items-center w-full py-24 lg:py-36 min-h-screen min-h-[100dvh]">
          {/* Left — copy */}
          <div className="space-y-7">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-extrabold tracking-tight text-white"
              style={{ fontSize: 'clamp(2.75rem, 6vw, 6.25rem)', lineHeight: 1.02, letterSpacing: '-0.02em' }}
            >
              Your Network Starts{' '}
              <span
                className="font-serif-display bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(100deg, ${GOLD} 0%, #fff 45%, ${ACCENT} 100%)` }}
              >
                With a Tap.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="max-w-md text-lg font-light"
              style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}
            >
              TapByWisein helps founders, professionals, and event attendees instantly exchange
              details, build meaningful connections, and grow their network with NFC-powered smart
              cards.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="flex items-start gap-2 sm:gap-3 pt-2"
            >
              <div className="flex flex-1 sm:flex-none flex-col items-start gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                  Organizing an event?
                </span>
                <button className={`${btnPrimary} w-full`} style={{ background: ACCENT_GRADIENT }} onClick={goCreate}>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  <span className="relative whitespace-nowrap">Create Event</span>
                  <ArrowRight className="relative w-4 h-4 shrink-0" />
                </button>
              </div>
              <div className="flex flex-1 sm:flex-none flex-col items-start gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: TEXT_DIM }}>
                  Just attending?
                </span>
                <Link to="/discover" className={`${btnGhostDark} w-full`}>
                  <span className="whitespace-nowrap">Explore events</span>
                  <ArrowDown className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <FeatureBento />

      {/* ── How it works (light, alternating tinted cards) ────────────────── */}
      <section className="bg-white">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h2 className="text-center font-extrabold tracking-tight text-[#0A0A0A]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1 }}>
            Networking in <span className="font-serif-display" style={{ color: ACCENT }}>three taps.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base" style={{ color: '#6B7280', lineHeight: 1.6 }}>
            No app downloads, no fumbling with business cards. Just tap and connect.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { icon: ScanLine, t: 'Tap or scan', b: "Tap an NFC card or scan a QR to open a founder's card instantly. No app needed.", solid: true },
              { icon: BadgeCheck, t: 'See their card', b: "Who they are, what they're building, and what they're looking for, at a glance.", solid: false },
              { icon: Users, t: 'Connect & follow up', b: 'Connect in one tap, then message and follow up after the event.', solid: false },
            ].map((s, i) => {
              const solid = i === 0;
              return (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '200px' }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="rounded-3xl p-8 md:p-10 transition-transform duration-300 hover:-translate-y-1"
                  style={
                    solid
                      ? { background: ACCENT_GRADIENT, boxShadow: '0 20px 50px -20px rgba(76,123,255,0.5)' }
                      : { background: TINT, border: '1px solid rgba(0,0,0,0.06)' }
                  }
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={solid ? { background: 'rgba(255,255,255,0.18)' } : { background: '#fff' }}
                  >
                    <s.icon className="h-6 w-6" style={{ color: solid ? '#fff' : ACCENT }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: solid ? '#fff' : '#0A0A0A' }}>{s.t}</p>
                  <p className="mt-2 text-sm" style={{ color: solid ? 'rgba(255,255,255,0.85)' : '#6B7280', lineHeight: 1.6 }}>
                    {s.b}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Use cases strip ───────────────────────────────────────────────── */}
      <section className="bg-white border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-xwide mx-auto px-6 py-10">
          <p className="text-center text-xs uppercase tracking-[0.05em] mb-5" style={{ color: '#6B7280' }}>
            Built for founder meetups, demo days &amp; conferences
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Demo Day', 'Founder Meetup', 'Startup Summit', 'Pitch Night', 'TechConf'].map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
                style={{ background: TINT, color: '#0A0A0A' }}
              >
                <BadgeCheck className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Organizer CTA (dark navy) ─────────────────────────────────────── */}
      <section className="bg-grain" style={{ background: NAVY }}>
        <div className="max-w-xwide mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-white/[0.02] px-8 py-14 md:px-16 md:py-20 text-center shadow-[0_40px_100px_-40px_rgba(0,0,0,0.6)]">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(76,123,255,0.25)' }} />
              <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(216,182,117,0.16)' }} />
            </div>
            <div className="relative">
              <span
                className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-5 ring-1 ring-white/10"
                style={{ background: 'rgba(76,123,255,0.15)' }}
              >
                <Calendar className="w-6 h-6" style={{ color: ACCENT }} />
              </span>
              <h2 className="font-extrabold tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.06 }}>
                Add TapByWisein to your{' '}
                <span
                  className="font-serif-display bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(100deg, ${GOLD} 0%, #fff 45%, ${ACCENT} 100%)` }}
                >
                  next event.
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg" style={{ color: TEXT_DIM, lineHeight: 1.6 }}>
                2-minute setup. Issue cards, capture connections, and send a recap. No hardware required.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button className={btnSolidLight} onClick={goCreate}>
                  Create your first event
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className={btnGhostDark} onClick={() => setDemoOpen(true)}>
                  Request a demo
                </button>
                <Link to="/pricing" className="inline-flex items-center px-4 py-4 text-base font-medium text-white/70 transition-colors hover:text-white">
                  See pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NFC Tap Card story ──────────────────────────────────────────────
          "Your network, one tap away" — problem, product, how it works,
          benefits, use cases, an honest trust note, pricing, and FAQ. ──── */}
      <TapCardSection />

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0A0E2E', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-xwide mx-auto px-6 pt-12 overflow-hidden">
          <ParticleWordmark text="TAPBYWISEIN" className="select-none" />
        </div>
        <div className="max-w-xwide mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: TEXT_DIM }}>
          <span>© {new Date().getFullYear()} TapByWisein</span>
          <nav className="flex items-center gap-6">
            <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link to="/discover" className="transition-colors hover:text-white">Discover</Link>
          </nav>
        </div>
        <div
          className="max-w-xwide mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ color: 'rgba(167,175,206,0.7)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span>© {new Date().getFullYear()} TapByWisein™. All rights reserved.</span>
          <nav className="flex items-center gap-5">
            <Link to="/terms" className="transition-colors hover:text-white">Terms and Conditions</Link>
            <Link to="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="transition-colors hover:text-white">Refund Policy</Link>
          </nav>
        </div>
        <div className="max-w-xwide mx-auto px-6 pb-8 text-center text-xs" style={{ color: 'rgba(167,175,206,0.6)' }}>
          Powered by Sanshi Network Tech Pvt. Ltd.
        </div>
      </footer>

      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <ExitIntentPopup />
    </div>
  );
};

export default LandingPage;
