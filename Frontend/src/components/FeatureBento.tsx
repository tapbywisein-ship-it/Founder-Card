import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Sparkles } from 'lucide-react';
import { publicService } from '@/services/public.service';

const ACCENT = '#4C7BFF';
const ACCENT_GRADIENT = 'linear-gradient(135deg, #7C9BFF 0%, #4C7BFF 55%, #2A48B8 100%)';
const GOLD = '#D8B675';
const GOLD_GRADIENT = 'linear-gradient(135deg, #F3E0B4 0%, #D8B675 55%, #A9803F 100%)';
const TINT = '#EAF1FF';
const NAVY = 'radial-gradient(130% 100% at 88% 100%, #161F5C 0%, #0A0E2E 42%, #050612 100%)';

/** Real product screenshot, framed like a browser window. Used for both dashboards. */
const BrowserFrame = ({ src, alt, url }: { src: string; alt: string; url: string }) => (
  <div className="relative rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-xl p-2.5 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.6)]">
    <div className="flex items-center gap-1.5 px-1.5 pb-2">
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="ml-2 flex-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/40 truncate">
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
    className="flex h-8 w-8 items-center justify-center rounded-full text-white text-[10px] font-semibold ring-2"
    style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: '0 0 0 2px #0A0E2E' }}
    aria-hidden
  >
    {label}
  </div>
);

interface BentoCardProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  delay?: number;
}

const BentoCard = ({ className = '', style, children, delay = 0 }: BentoCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.45, delay }}
    className={`rounded-3xl p-7 md:p-9 ${className}`}
    style={style}
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
    <section className="bg-grain relative overflow-hidden" style={{ background: NAVY }}>
      <div className="max-w-xwide mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="font-extrabold tracking-tight text-white" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.25rem)', lineHeight: 1.08 }}>
            Built for how founders{' '}
            <span
              className="font-serif-display bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(100deg, ${GOLD} 0%, #fff 45%, ${ACCENT} 100%)` }}
            >
              actually connect.
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base" style={{ color: '#A7AFCE', lineHeight: 1.6 }}>
            One platform for organizers to run the room, and for founders to make every connection count.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Left — tall card, organizer side (portrait screenshot fills the height naturally) */}
          <BentoCard
            className="flex flex-col h-full items-center text-center"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 30px 70px -30px rgba(76,123,255,0.55)' }}
          >
            <h3 className="text-2xl font-bold text-white max-w-xs">Run the whole event, end to end</h3>
            <p className="mt-3 text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
              Ticket tiers, guest lists, check-in, and live analytics — all from one organizer dashboard.
            </p>
            <div className="mt-6 flex-1 flex items-end w-full max-w-[280px]">
              <BrowserFrame src="/organiser.png" alt="TapByWisein organizer dashboard" url="tapbywisein.com/organizer/dashboard" />
            </div>
          </BentoCard>

          {/* Right column — attendee side */}
          <div className="flex flex-col gap-5">
            <BentoCard style={{ background: TINT, border: '1px solid rgba(0,0,0,0.06)' }} delay={0.08}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0A0A0A]">See what's happening in your network</h3>
                  <p className="mt-2 text-sm text-[#6B7280]" style={{ lineHeight: 1.6 }}>
                    Curated founder meetups, demo days, and pitch nights. Filter by city and RSVP in one tap.
                  </p>
                </div>
                <div className="w-full md:w-64 shrink-0">
                  <BrowserFrame src="/attendedashboard.png" alt="TapByWisein attendee dashboard" url="tapbywisein.com/dashboard" />
                </div>
              </div>
            </BentoCard>

            <div className="grid grid-cols-2 gap-5 flex-1">
              <BentoCard style={{ background: TINT, border: '1px solid rgba(0,0,0,0.06)' }} delay={0.14}>
                <p className="text-lg font-bold text-[#0A0A0A] leading-snug">
                  {founders > 0 ? `Trusted by ${founders.toLocaleString('en-IN')}+` : 'Trusted by'}
                  <br />
                  verified founders
                </p>
                <div className="mt-4 flex items-center -space-x-2.5">
                  <Avatar label="A" from="#7C9BFF" to="#4C7BFF" />
                  <Avatar label="P" from="#4C7BFF" to="#7C3AED" />
                  <Avatar label="S" from="#06B6D4" to="#4C7BFF" />
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ background: GOLD_GRADIENT, color: '#3A2C0E', boxShadow: '0 0 0 2px #0A0E2E' }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </div>
                </div>
              </BentoCard>

              <BentoCard style={{ background: ACCENT_GRADIENT }} delay={0.18}>
                <p className="text-lg font-bold text-white leading-snug">
                  {connections > 0 ? `${connections.toLocaleString('en-IN')}+ connections` : 'Real connections'}
                  <br />
                  made in person
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: GOLD_GRADIENT, color: '#3A2C0E' }}>
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
