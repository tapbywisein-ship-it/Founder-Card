import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Nfc, Smartphone, RefreshCcw, Award, ArrowRight, Info,
  Mic, Handshake, GraduationCap, Sticker,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeUp } from '@/lib/motion';

/* Luma-style accent word — brand-blue gradient, theme-aware via --primary. */
const ACCENT_GRADIENT = 'linear-gradient(100deg, hsl(var(--primary)) 0%, #9DCAFF 100%)';

const accentSpan = (text: string) => (
  <span
    className="font-serif-display bg-clip-text text-transparent"
    style={{ backgroundImage: ACCENT_GRADIENT }}
  >
    {text}
  </span>
);

const BENEFITS = [
  {
    icon: Smartphone,
    title: 'Zero friction. Seriously zero.',
    body: 'QR codes need a camera, good lighting, and a steady hand. NFC needs nothing but two phones touching. At a crowded event, that’s the difference between a connection made and a connection missed.',
  },
  {
    icon: Nfc,
    title: 'Works on every phone - no app required.',
    body: 'Android reads NFC tags natively. iPhones pick them up right from the lock screen. Whoever you tap doesn’t need TapByWisein installed - your card just opens in their browser.',
  },
  {
    icon: RefreshCcw,
    title: 'Your profile, always up to date.',
    body: 'Printed business cards go stale the moment your job title changes. Your Tap Card doesn’t - it points to your live profile, so every tap shows your current bio, company, and skills. No reprints, ever.',
  },
  {
    icon: Award,
    title: 'Every tap counts toward your network.',
    body: 'A tap connects you the same way a QR scan does - instant, no request/approve step, tied to the event you’re both at, and counted in your FK Score.',
  },
];

const USE_CASES = [
  { icon: Mic, title: 'At conferences', body: 'Walk the floor. Tap instead of scan. Keep the conversation going.' },
  { icon: Handshake, title: 'At client meetings', body: 'Hand them your card - one tap on their phone puts your profile and contact details in front of them. No paper, no app.' },
  { icon: GraduationCap, title: 'At college fests & hackathons', body: 'Make every intro count. Tap into event-tagged networking and watch your FK Score climb.' },
  { icon: Sticker, title: 'Everywhere else', body: 'Stick it on your laptop, your notebook, your badge. Let the world tap in.' },
];

const FAQS = [
  {
    q: 'Do they need the TapByWisein app to receive my tap?',
    a: 'No. Their phone handles it natively - Android and iPhone both open NFC URLs automatically. No app needed on their end.',
  },
  {
    q: "What if their NFC is turned off?",
    a: 'NFC is on by default on most phones. As a backup, your Tap Card page also has your QR code - so you’re always covered.',
  },
  {
    q: 'Can I update what’s on my card after I get it?',
    a: 'Yes - that’s the point. Your card just holds a link. Update your profile anytime and every past tap shows your new info. The card itself never needs to change.',
  },
  {
    q: 'What’s an FK Score?',
    a: 'FK Score is TapByWisein’s measure of your professional network strength. Every tap, scan, and verified connection adds to it.',
  },
  {
    q: 'Can I have more than one Tap Card?',
    a: 'Yes - useful for keeping personal and professional profiles separate, or for sticking NFC stickers on multiple items.',
  },
];

/**
 * "Your network, one tap away" — the NFC Tap Card story, from the problem
 * QR codes have at a live event through how tapping works, what it's good
 * for, pricing, and an honest note on what the tag actually is (a public
 * URL, same trust model as a QR code — not a secure hardware token).
 *
 * Both purchase paths route through auth: /apply-card and /connect are
 * ProtectedRoute, so a logged-out click bounces to /login with the return
 * path preserved and lands the visitor right back here after signing in.
 */
export const TapCardSection = () => {
  return (
    <>
      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-24 text-center">
          <motion.span
            {...fadeUp()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary mb-5"
          >
            <Nfc className="w-3.5 h-3.5" /> NFC Tap Card
          </motion.span>
          <motion.h2
            {...fadeUp(0.05)}
            className="mx-auto max-w-2xl font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 4rem)', lineHeight: 1.08 }}
          >
            Your network,{' '}
            <span className="font-serif-display text-primary">one tap away.</span>
          </motion.h2>
          <motion.p
            {...fadeUp(0.1)}
            className="mx-auto mt-4 max-w-md text-lg text-muted-foreground"
            style={{ lineHeight: 1.65 }}
          >
            No app. No camera. No fumbling. Just tap your card, and you're connected.
          </motion.p>
          <motion.div {...fadeUp(0.15)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/apply-card">
                Get Your Tap Card - ₹499 <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/connect">Write Your Own Sticker - Free</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Problem / agitator ─────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <motion.h3
            {...fadeUp()}
            className="font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', lineHeight: 1.15 }}
          >
            QR codes are great. Until they're not.
          </motion.h3>
          <motion.p {...fadeUp(0.05)} className="mt-4 text-base text-muted-foreground" style={{ lineHeight: 1.7 }}>
            Bad lighting. Hands full. Camera won't focus. At the moments that matter most - a
            packed conference floor, a quick hallway intro, a networking dinner - pulling out your
            phone and saying "let me scan you" kills the momentum.
          </motion.p>
          <motion.p {...fadeUp(0.1)} className="mt-4 text-base font-semibold text-primary">
            There's a better way.
          </motion.p>
        </div>
      </section>

      {/* ── Product intro ──────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-20 text-center">
          {/* Real card art — front + back, gently fanned. drop-shadow (not
              box-shadow) so it follows the PNG's rounded-corner alpha. */}
          <motion.div
            {...fadeUp()}
            className="mx-auto mb-8 flex items-center justify-center gap-3 sm:gap-5"
          >
            <img
              src="/card-front.png"
              alt="Tap Card front - name, title and contact"
              className="w-40 sm:w-64 -rotate-3 drop-shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
            />
            <img
              src="/card-back.png"
              alt="Tap Card back - scan-me QR code"
              className="w-40 sm:w-64 rotate-3 drop-shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
            />
          </motion.div>
          <motion.h3
            {...fadeUp(0.05)}
            className="font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}
          >
            Meet the Tap Card.
          </motion.h3>
          <motion.p
            {...fadeUp(0.1)}
            className="mx-auto mt-4 max-w-lg text-base text-muted-foreground"
            style={{ lineHeight: 1.7 }}
          >
            A smart card (or sticker) that shares your full TapByWisein profile with a single
            physical tap. No QR scanning. No app download. No typing. Just touch. Done.
          </motion.p>
          <motion.p {...fadeUp(0.15)} className="mt-3 text-xs italic text-muted-foreground">
            Works with every Android and iPhone - right from the lock screen.
          </motion.p>
        </div>
      </section>

      {/* ── How it works (3 numbered steps) ────────────────────────────── */}
      <section className="bg-[#e7e5e3]">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h3 className="text-center font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
            It's almost embarrassingly simple.
          </h3>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { n: '01', t: 'Tap', b: 'Hold your Tap Card near the back of any smartphone for about a second.' },
              { n: '02', t: "Their phone does the rest", b: 'A native prompt appears on their screen - no camera, no app, no friction.' },
              { n: '03', t: "You're connected", b: 'They land on your live Tap Card. One tap to connect - your event, profile, and FK Score all update instantly.' },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                {...fadeUp(i * 0.08)}
                className="rounded-card border border-border bg-card p-8 md:p-10 shadow-card-xs transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="font-serif-display text-4xl text-primary/50">{s.n}</span>
                <p className="mt-3 text-lg font-bold text-foreground">{s.t}</p>
                <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>{s.b}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
            That's it. Three steps. One second.
          </p>
        </div>
      </section>

      {/* ── Benefits ───────────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-y border-border">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h3 className="text-center font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}>
            Why the Tap Card {accentSpan('changes everything.')}
          </h3>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                {...fadeUp(i * 0.06)}
                className="rounded-card border border-border bg-card p-8 shadow-card-xs transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl mb-4 bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </span>
                <p className="text-base font-bold text-foreground">{b.title}</p>
                <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.65 }}>{b.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Two ways to get one — quick comparison */}
          <motion.div
            {...fadeUp(0.1)}
            className="mt-6 grid gap-5 sm:grid-cols-2 rounded-card border border-border bg-card p-8 md:p-10 shadow-card-xs"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.08em] font-semibold text-muted-foreground">DIY Sticker</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">Free</p>
              <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                Write to a blank NTAG sticker straight from your phone. Best for testing it out, or
                stickers on your laptop and phone.
              </p>
            </div>
            <div className="sm:border-l sm:border-border sm:pl-8">
              <p className="text-xs uppercase tracking-[0.08em] font-semibold text-primary">Physical Tap Card</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">₹499</p>
              <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                A pre-linked card shipped right to you. Best for professionals who want the real
                deal.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Use cases ───────────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3]">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h3 className="text-center font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
            Built for the moments that matter.
          </h3>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((u, i) => (
              <motion.div
                key={u.title}
                {...fadeUp(i * 0.06)}
                className="rounded-card border border-border bg-card p-6 shadow-card-xs transition-transform duration-300 hover:-translate-y-1"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 bg-primary/10">
                  <u.icon className="h-5 w-5 text-primary" />
                </span>
                <p className="text-sm font-bold text-foreground">{u.title}</p>
                <p className="mt-1.5 text-xs text-muted-foreground" style={{ lineHeight: 1.6 }}>{u.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Honest / trust note ─────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <motion.div
            {...fadeUp()}
            className="rounded-card border-l-4 border-primary bg-secondary p-6 md:p-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                One thing worth knowing
              </p>
            </div>
            <p className="text-sm text-secondary-foreground" style={{ lineHeight: 1.7 }}>
              Your Tap Card stores a public URL - the same link anyone would get from scanning your
              QR code. It's not an encrypted chip or a secure hardware token.
            </p>
            <p className="mt-3 text-sm text-secondary-foreground" style={{ lineHeight: 1.7 }}>
              <strong>What it is:</strong> a fast, always-current, frictionless way to share your
              public profile. <strong>What it isn't:</strong> a replacement for sensitive document
              sharing or identity verification.
            </p>
            <p className="mt-3 text-sm text-secondary-foreground" style={{ lineHeight: 1.7 }}>
              If you're already comfortable sharing a QR code, the Tap Card works exactly the same
              way - just faster.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing CTA ─────────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-24">
          <h3 className="text-center font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Ready to {accentSpan('tap in?')}
          </h3>
          <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            <motion.div
              {...fadeUp()}
              className="rounded-card border border-border bg-card p-8 md:p-10 flex flex-col shadow-card-xs"
            >
              <p className="text-xs uppercase tracking-[0.08em] font-semibold text-muted-foreground">Free</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">DIY Sticker</p>
              <p className="mt-3 text-sm flex-1 text-muted-foreground" style={{ lineHeight: 1.65 }}>
                Already have a blank NTAG sticker? Open TapByWisein, go to Connect, and write your
                profile link to it in seconds - Android via Chrome, iPhone via Shortcut. Done.
              </p>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link to="/connect">
                  Write My Sticker <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div
              {...fadeUp(0.08)}
              className="relative overflow-hidden rounded-card bg-primary text-primary-foreground p-8 md:p-10 flex flex-col shadow-card"
            >
              <p className="text-xs uppercase tracking-[0.08em] font-semibold text-primary-foreground/80">₹499</p>
              <p className="mt-1 text-2xl font-extrabold">Physical Tap Card</p>
              <p className="mt-3 text-sm flex-1 text-primary-foreground/85" style={{ lineHeight: 1.65 }}>
                A proper card with your tag pre-linked, shipped right to you. Built to last. Ready
                to impress.
              </p>
              <Button asChild variant="primary-invert" className="mt-6 w-full">
                <Link to="/apply-card">
                  Order My Tap Card <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-[#e7e5e3] border-t border-border scroll-mt-20">
        <div className="max-w-2xl mx-auto px-6 py-24">
          <h3 className="text-center font-extrabold tracking-tight text-foreground mb-10" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)' }}>
            Frequently asked
          </h3>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-border bg-card px-5 py-4"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-foreground">
                  {f.q}
                  <span className="shrink-0 text-lg text-primary transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground" style={{ lineHeight: 1.7 }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA strip ────────────────────────────────────────────── */}
      <section className="bg-[#e7e5e3] border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-16 text-center">
          <h3 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
            Stop handing out paper.
          </h3>
          <p className="mt-2 text-base text-muted-foreground">
            Start making real connections.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/apply-card">Get Your Tap Card - ₹499</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/connect">Write a Free Sticker</Link>
            </Button>
          </div>
          <p className="mt-8 text-xs italic text-muted-foreground">
            TapByWisein - Professional networking, built for the real world.
          </p>
        </div>
      </section>
    </>
  );
};
