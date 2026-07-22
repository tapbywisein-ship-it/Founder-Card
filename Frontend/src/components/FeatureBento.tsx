import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Sparkles } from 'lucide-react';
import { publicService } from '@/services/public.service';

/* Luma-style accent word — brand-blue gradient, theme-aware via --primary. */
const ACCENT_GRADIENT = 'linear-gradient(100deg, hsl(var(--primary)) 0%, #8AA6FF 100%)';

/** Real product screenshot, framed like a browser window. Used for both dashboards. */
const BrowserFrame = ({ src, alt, url }: { src: string; alt: string; url: string }) => (
  <div className="relative rounded-2xl border border-border bg-card p-2.5 shadow-card">
    <div className="flex items-center gap-1.5 px-1.5 pb-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
      <span className="ml-2 flex-1 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground truncate">
        {url}
      </span>
    </div>
    <div className="rounded-xl overflow-hidden">
      <img src={src} alt={alt} className="w-full h-auto block" />
    </div>
  </div>
);

const Avatar = ({ label, from, to }: { label: string; from: string; to: string }) => (
  <div
    className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[10px] font-semibold"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: '0 0 0 2px hsl(var(--background))' }}
    aria-hidden
  >
    {label}
  </div>
);

const BentoCard = ({ className = '', children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '200px' }}
    transition={{ duration: 0.45, delay }}
    className={`rounded-card p-7 md:p-9 ${className}`}
  >
    {children}
  </motion.div>
);

export const FeatureBento = () => {
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => publicService.getStats(),
    select: (r) => r.data,
    staleTime: 5 * 60 * 1000,
  });
  const founders = stats?.founders ?? 0;
  const connections = stats?.connections ?? 0;

  return (
    <section className="bg-muted/40 border-y border-border">
      <div className="max-w-content mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', lineHeight: 1.08 }}>
            Built for how founders{' '}
            <span
              className="font-serif-display bg-clip-text text-transparent"
              style={{ backgroundImage: ACCENT_GRADIENT }}
            >
              actually connect.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground" style={{ lineHeight: 1.6 }}>
            One platform for organizers to run the room, and for founders to make every connection count.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Left — tall card, organizer side (portrait screenshot fills the height naturally) */}
          <BentoCard className="flex flex-col h-full items-center text-center bg-primary text-primary-foreground shadow-card">
            <h3 className="text-2xl font-bold max-w-xs">Run the whole event, end to end</h3>
            <p className="mt-3 text-sm max-w-xs text-primary-foreground/85" style={{ lineHeight: 1.6 }}>
              Ticket tiers, guest lists, check-in, and live analytics — all from one organizer dashboard.
            </p>
            <div className="mt-6 flex-1 flex items-end w-full max-w-[280px]">
              <BrowserFrame src="/organiser.png" alt="TapByWisein organizer dashboard" url="tapbywisein.com/organizer/dashboard" />
            </div>
          </BentoCard>

          {/* Right column — attendee side */}
          <div className="flex flex-col gap-5">
            <BentoCard className="bg-card border border-border shadow-card-xs" delay={0.08}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">See what's happening in your network</h3>
                  <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                    Curated founder meetups, demo days, and pitch nights. Filter by city and RSVP in one tap.
                  </p>
                </div>
                <div className="w-full md:w-64 shrink-0">
                  <BrowserFrame src="/attendedashboard.png" alt="TapByWisein attendee dashboard" url="tapbywisein.com/dashboard" />
                </div>
              </div>
            </BentoCard>

            <div className="grid grid-cols-2 gap-5 flex-1">
              <BentoCard className="bg-card border border-border shadow-card-xs" delay={0.14}>
                <p className="text-lg font-bold text-foreground leading-snug">
                  {founders > 0 ? `Trusted by ${founders.toLocaleString('en-IN')}+` : 'Trusted by'}
                  <br />
                  verified founders
                </p>
                <div className="mt-4 flex items-center -space-x-2.5">
                  <Avatar label="A" from="#7C9BFF" to="#4C7BFF" />
                  <Avatar label="P" from="#4C7BFF" to="#7C3AED" />
                  <Avatar label="S" from="#06B6D4" to="#4C7BFF" />
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold"
                    style={{ boxShadow: '0 0 0 2px hsl(var(--background))' }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="bg-primary text-primary-foreground shadow-card" delay={0.18}>
                <p className="text-lg font-bold leading-snug">
                  {connections > 0 ? `${connections.toLocaleString('en-IN')}+ connections` : 'Real connections'}
                  <br />
                  made in person
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
                  <BadgeCheck className="w-3 h-3" />
                  Verified Founder
                </div>
              </BentoCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
