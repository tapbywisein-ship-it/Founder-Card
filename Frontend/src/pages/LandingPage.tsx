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
import { Sparkles, Zap, Check, BadgeCheck, ArrowRight, Calendar, Users, ScanLine } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { Button } from '@/components/ui/button';
import { RequestDemoModal } from '@/components/RequestDemoModal';
import { ExitIntentPopup } from '@/components/ExitIntentPopup';
import { publicService } from '@/services/public.service';

/**
 * Hero preview card — a Founder Card credential mockup.
 * Vertical membership-card aesthetic: indigo gradient header with brand mark,
 * name + title block, QR code + member number footer, soft active-status chip.
 * No 3D tilt, no parallax, no gold — Luma-clean re-imagining of the original
 * FounderCardMockup that lived on this page in Phase 1.
 */
const HeroPreviewCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
    className="relative w-full max-w-sm mx-auto"
  >
    <div className="relative bg-card border border-border rounded-xl shadow-card overflow-hidden aspect-[3/4]">
      {/* Top gradient panel — brand mark + Founder label */}
      <div
        className="relative h-[44%] p-5 flex flex-col justify-between"
        style={{
          background:
            'linear-gradient(135deg, #a5b4fc 0%, #4f46e5 55%, #4338ca 100%)',
        }}
      >
        {/* Subtle grid texture */}
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
            FounderKey
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-white text-[10px] font-medium">
            <Sparkles className="w-3 h-3" />
            Founder
          </span>
        </div>
        <div className="relative">
          <p className="text-white/70 text-[10px] uppercase tracking-[0.2em] mb-1">
            Founder Card
          </p>
          <p className="text-white text-2xl font-semibold tracking-tight">
            Alex Chen
          </p>
          <p className="text-white/85 text-sm">
            Founder · NexusAI
          </p>
        </div>
      </div>

      {/* Bottom — meta + QR */}
      <div className="h-[56%] p-5 flex items-end justify-between gap-4">
        <div className="space-y-2.5 min-w-0 flex-1">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
              Member
            </p>
            <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
              FK-00087
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
              FK Score
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground tabular-nums leading-none">
              87
            </p>
          </div>
          <div className="inline-flex items-center gap-1 chip">
            <BadgeCheck className="w-3 h-3" />
            Active
          </div>
        </div>

        <div className="bg-white p-2 rounded-md border border-border flex-shrink-0">
          <QRCodeSVG
            value="founderkey://card/FK-00087"
            size={88}
            fgColor="#181a1f"
            bgColor="#ffffff"
            level="M"
          />
        </div>
      </div>
    </div>

    {/* Soft glow */}
    <div
      aria-hidden
      className="absolute inset-0 -z-10 blur-3xl opacity-30"
      style={{
        background:
          'radial-gradient(60% 50% at 50% 50%, hsl(var(--primary) / 0.5), transparent 70%)',
      }}
    />
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.user?.role);

  // Signed-in users never see the public landing page — send them to their
  // in-app home. This guarantees you can't end up on an "outside" page after
  // login, regardless of how you navigated here.
  if (isAuthenticated) {
    return <Navigate to={HOME_BY_ROLE[role ?? 'attendee'] ?? '/dashboard'} replace />;
  }

  // Luma pattern: clicking "Create Your First Event" drops the user straight
  // onto the event-creation page. The page itself prompts for sign-in via an
  // overlay popup when the user isn't authenticated yet — they don't lose the
  // form they've already started filling.
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
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero — single screen, no scroll for the fold */}
      <section className="relative min-h-[calc(100vh-64px)] mt-16 flex items-center">
        <div className="max-w-xwide mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full py-12 lg:py-0">
          {/* Left — copy */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="inline-flex items-center gap-2 chip-primary"
            >
              <Zap className="w-3.5 h-3.5" />
              Built for founders
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground"
            >
              Delightful events <span className="text-primary">start here.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
              className="text-lg text-muted-foreground max-w-md"
            >
              Set up an event page, invite founders, and host a memorable
              gathering today. Built for the network of people building the
              future.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <Button
                size="lg"
                className="text-base"
                onClick={goCreate}
              >
                Create Your First Event
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/discover">Explore events</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                One-tap RSVP
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" />
                Built-in check-in
              </span>
            </motion.div>
          </div>

          {/* Right — preview */}
          <div className="relative">
            <HeroPreviewCard />
          </div>
        </div>
      </section>

      {/* Social-proof counter */}
      {(founders > 0 || connections > 0) && (
        <section className="border-y border-border bg-muted/20">
          <div className="max-w-xwide mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center">
            <div>
              <p className="text-3xl font-bold text-foreground">{founders.toLocaleString('en-IN')}+</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Founders</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{connections.toLocaleString('en-IN')}+</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Connections made</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Join the founders already connecting on FounderKey.
            </p>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-xwide mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-foreground text-center mb-2">How FounderKey works</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">Networking at events, in three taps.</p>
        <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          {[
            { icon: ScanLine, t: 'Tap or scan', b: "Tap an NFC card or scan a QR to open a founder's card instantly — no app needed." },
            { icon: BadgeCheck, t: 'See their card', b: 'Who they are, what they’re building, and what they’re looking for — at a glance.' },
            { icon: Users, t: 'Connect & follow up', b: 'Connect in one tap, then message and follow up after the event.' },
          ].map((s) => (
            <div key={s.t} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold text-foreground">{s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trusted by / logos strip (placeholder until real partners added) */}
      <section className="border-y border-border bg-muted/10">
        <div className="max-w-xwide mx-auto px-6 py-8">
          <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Built for founder meetups, demo days &amp; conferences
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-60">
            {['Demo Day', 'Founder Meetup', 'Startup Summit', 'Pitch Night', 'TechConf'].map((n) => (
              <span key={n} className="text-sm font-semibold tracking-tight text-muted-foreground">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Organizer CTA */}
      <section className="max-w-xwide mx-auto px-6 py-16">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 md:p-12 text-center">
          <Calendar className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            Add FounderKey to your next event
          </h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            2-minute setup. Issue cards, capture connections, and send a recap — no hardware required.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={goCreate}>
              Create your first event <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDemoOpen(true)}>
              Request a demo
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} FounderKey</span>
          <nav className="flex items-center gap-5">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/discover" className="hover:text-foreground">Discover</Link>
          </nav>
        </div>
      </footer>

      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <ExitIntentPopup />
    </div>
  );
};

export default LandingPage;
