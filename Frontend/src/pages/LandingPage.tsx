import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const HOME_BY_ROLE: Record<string, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Zap, Check, BadgeCheck, ArrowRight, ArrowDown, Calendar, Users, ScanLine } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { RequestDemoModal } from '@/components/RequestDemoModal';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { publicService } from '@/services/public.service';

/* ── Design tokens (scoped to the marketing page) ──────────────────────────── */
const NAVY = 'linear-gradient(165deg, #0A0E2E 0%, #0D1240 100%)';
const ACCENT = '#3B6FF0';
const TINT = '#EAF1FF';
const TEXT_DIM = '#B0B8D1';

/* Pill buttons — fully rounded, generous padding (spec). */
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#3B6FF0] px-8 py-4 text-base font-semibold text-white shadow-[0_8px_30px_-8px_rgba(59,111,240,0.6)] transition-transform transition-[filter] duration-200 hover:scale-[1.02] hover:brightness-110';
const btnGhostDark =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base font-medium text-white transition-colors duration-200 hover:bg-white/10';
const btnSolidLight =
  'inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#0A0A0A] transition-transform duration-200 hover:scale-[1.02]';

/** Small community avatar — gradient fill + initials, for the "people" feel. */
const Avatar = ({ label, from, to, className = '' }: { label: string; from: string; to: string; className?: string }) => (
  <div
    className={`flex items-center justify-center rounded-full text-white font-semibold ring-2 ring-white/15 ${className}`}
    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    aria-hidden
  >
    {label}
  </div>
);

/**
 * Hero Tap Card mockup, framed inside a browser/app window that overlaps the
 * section edge for depth.
 */
const HeroPreviewCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
    className="relative w-full max-w-md mx-auto"
  >
    {/* Browser frame */}
    <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-1.5 px-2 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="ml-3 flex-1 rounded-full bg-white/[0.06] px-3 py-1 text-[10px] text-white/40">
          tapbywisein.com/c/alex-chen
        </span>
      </div>

      {/* The card */}
      <div className="relative overflow-hidden rounded-2xl bg-white aspect-[3/4]">
        <div
          className="relative h-[44%] p-5 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #5B8BFF 0%, #3B6FF0 55%, #2B4FC0 100%)' }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'linear-gradient(0deg, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-white/90 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <Zap className="w-3.5 h-3.5 fill-white/90" />
              TapByWisein
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-white text-[10px] font-medium">
              <Sparkles className="w-3 h-3" />
              Founder
            </span>
          </div>
          <div className="relative">
            <p className="text-white/70 text-[10px] uppercase tracking-[0.2em] mb-1">Tap Card</p>
            <p className="text-white text-2xl font-bold tracking-tight">Alex Chen</p>
            <p className="text-white/85 text-sm">Founder · NexusAI</p>
          </div>
        </div>

        <div className="h-[56%] p-5 flex items-end justify-between gap-4">
          <div className="space-y-2.5 min-w-0 flex-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#6B7280] mb-0.5">Member</p>
              <p className="font-mono text-sm font-semibold text-[#0A0A0A] tabular-nums">TW-00087</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#6B7280] mb-0.5">FK Score</p>
              <p className="font-mono text-2xl font-bold text-[#0A0A0A] tabular-nums leading-none">87</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF1FF] px-2.5 py-1 text-[11px] font-medium text-[#3B6FF0]">
              <BadgeCheck className="w-3 h-3" />
              Active
            </span>
          </div>

          <div className="bg-white p-2 rounded-md border border-black/[0.06] flex-shrink-0">
            <QRCodeSVG value="tapbywisein://card/TW-00087" size={88} fgColor="#0A0A0A" bgColor="#ffffff" level="M" />
          </div>
        </div>
      </div>
    </div>

    {/* Glow */}
    <div
      aria-hidden
      className="absolute inset-0 -z-10 blur-3xl opacity-50"
      style={{ background: 'radial-gradient(55% 45% at 60% 40%, rgba(59,111,240,0.55), transparent 70%)' }}
    />
  </motion.div>
);

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
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => publicService.getStats(),
    select: (r) => r.data,
    staleTime: 5 * 60 * 1000,
  });
  const founders = stats?.founders ?? 0;
  const connections = stats?.connections ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#0A0E2E' }}>
      <LandingNav />

      {/* ── Hero (dark navy) ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16" style={{ background: NAVY }}>
        {/* Ambient accent glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl" style={{ background: 'rgba(59,111,240,0.18)' }} />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl" style={{ background: 'rgba(59,111,240,0.12)' }} />
        </div>

        <div className="relative max-w-xwide mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full py-16 lg:py-24">
          {/* Left — copy */}
          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-medium text-white"
            >
              <Zap className="w-3.5 h-3.5" style={{ color: ACCENT }} />
              Built for founders
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="font-extrabold tracking-tight text-white"
              style={{ fontSize: 'clamp(2.75rem, 6vw, 6rem)', lineHeight: 1.04 }}
            >
              Delightful events{' '}
              <span className="italic" style={{ color: ACCENT }}>
                start here.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="max-w-md text-lg"
              style={{ color: TEXT_DIM, lineHeight: 1.6 }}
            >
              Set up an event page, invite founders, and host a memorable gathering today — built for
              the network of people building the future.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <button className={btnPrimary} onClick={goCreate}>
                Create Your First Event
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link to="/discover" className={btnGhostDark}>
                Explore events
                <ArrowDown className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm"
              style={{ color: TEXT_DIM }}
            >
              {['Free to start', 'One-tap RSVP', 'Built-in check-in'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" style={{ color: ACCENT }} />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right — framed preview */}
          <div className="relative">
            <HeroPreviewCard />
          </div>
        </div>
      </section>

      {/* ── Social proof + community avatars ──────────────────────────────── */}
      <section className="relative" style={{ background: NAVY }}>
        <div className="max-w-xwide mx-auto px-6 pb-16">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center -space-x-3">
              <Avatar label="A" from="#5B8BFF" to="#3B6FF0" className="h-11 w-11 text-sm" />
              <Avatar label="P" from="#3B6FF0" to="#7C3AED" className="h-11 w-11 text-sm" />
              <Avatar label="S" from="#06B6D4" to="#3B6FF0" className="h-11 w-11 text-sm" />
              <Avatar label="M" from="#3B6FF0" to="#2B4FC0" className="h-11 w-11 text-sm" />
              <Avatar label="+" from="#1E2A66" to="#0D1240" className="h-11 w-11 text-sm" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center">
              {founders > 0 && (
                <div>
                  <p className="text-3xl font-extrabold text-white">{founders.toLocaleString('en-IN')}+</p>
                  <p className="text-xs uppercase tracking-[0.05em]" style={{ color: TEXT_DIM }}>Founders</p>
                </div>
              )}
              {connections > 0 && (
                <div>
                  <p className="text-3xl font-extrabold text-white">{connections.toLocaleString('en-IN')}+</p>
                  <p className="text-xs uppercase tracking-[0.05em]" style={{ color: TEXT_DIM }}>Connections made</p>
                </div>
              )}
              <p className="max-w-xs text-sm" style={{ color: TEXT_DIM }}>
                Join the founders already connecting on TapByWisein.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (light, alternating tinted cards) ────────────────── */}
      <section className="bg-white">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h2 className="text-center font-extrabold tracking-tight text-[#0A0A0A]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1 }}>
            Networking in <span className="italic" style={{ color: ACCENT }}>three taps.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base" style={{ color: '#6B7280', lineHeight: 1.6 }}>
            No app downloads, no fumbling with business cards. Just tap and connect.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { icon: ScanLine, t: 'Tap or scan', b: "Tap an NFC card or scan a QR to open a founder's card instantly — no app needed.", solid: true },
              { icon: BadgeCheck, t: 'See their card', b: "Who they are, what they're building, and what they're looking for — at a glance.", solid: false },
              { icon: Users, t: 'Connect & follow up', b: 'Connect in one tap, then message and follow up after the event.', solid: false },
            ].map((s, i) => {
              const solid = i === 0;
              return (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="rounded-3xl p-8 md:p-10"
                  style={
                    solid
                      ? { background: ACCENT }
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
      <section style={{ background: NAVY }}>
        <div className="max-w-xwide mx-auto px-6 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] px-8 py-14 md:px-16 md:py-20 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(59,111,240,0.25)' }} />
            </div>
            <div className="relative">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-5" style={{ background: 'rgba(59,111,240,0.15)' }}>
                <Calendar className="w-6 h-6" style={{ color: ACCENT }} />
              </span>
              <h2 className="font-extrabold tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.06 }}>
                Add TapByWisein to your{' '}
                <span className="italic" style={{ color: ACCENT }}>next event.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-lg" style={{ color: TEXT_DIM, lineHeight: 1.6 }}>
                2-minute setup. Issue cards, capture connections, and send a recap — no hardware required.
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

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0A0E2E', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-xwide mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm" style={{ color: TEXT_DIM }}>
          <span>© {new Date().getFullYear()} TapByWisein</span>
          <nav className="flex items-center gap-6">
            <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
            <Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-white">Terms</Link>
            <Link to="/discover" className="transition-colors hover:text-white">Discover</Link>
          </nav>
        </div>
      </footer>

      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <ExitIntentPopup />
    </div>
  );
};

export default LandingPage;
