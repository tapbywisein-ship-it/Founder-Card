import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, CreditCard } from 'lucide-react';
import { PublicNav } from '@/components/PublicNav';
import { Button } from '@/components/ui/button';
import { RequestDemoModal } from '@/components/RequestDemoModal';
import { FeatureBento } from '@/components/FeatureBento';
import { useAppStore } from '@/store/appStore';
import { PortalLayout } from '@/components/PortalLayout';
import { startSubscription, type PlanKey } from '@/services/membership.service';

type Tier = {
  name: string;
  price: string;
  period?: string;
  sub: string;
  cta: string;
  to: string | null;
  plan?: PlanKey; // paid tiers open Razorpay checkout instead of navigating
  highlight?: boolean;
  features: string[];
  limits?: string[];
};

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '₹0',
    sub: 'Join events.',
    cta: 'Start free',
    to: '/register',
    features: [
      'WiseIN profile + public digital card',
      'QR sharing · join free events',
      'Register for paid events',
      'Connect, message & communities',
      'Basic networking analytics',
      '100 profile views / month',
    ],
    limits: ['No NFC card, lead capture, custom blocks or CRM notes', 'Cannot host events'],
  },
  {
    name: 'Tap Pro',
    price: '₹299',
    period: '/mo · ₹2,999/yr',
    sub: 'Network better.',
    cta: 'Go Pro',
    to: null,
    plan: 'pro_monthly',
    highlight: true,
    features: [
      'Everything in Free',
      'Lead capture + contact export',
      'Connection notes, CRM tags & reminders',
      'Custom card sections + branding',
      'Startup showcase + “Open to” badges',
      'Unlimited analytics & card views',
      'Advanced suggestions + impact reports',
    ],
  },
  {
    name: 'Organizer Lite',
    price: '₹999',
    period: '/mo',
    sub: 'Host meetups.',
    cta: 'Start hosting',
    to: null,
    plan: 'org_lite',
    features: [
      'Host free & paid events',
      'Waitlists · approval entry · coupons',
      'Check-in, guest lists & analytics',
      'Email blasts + community creation',
      'Co-host support',
    ],
    limits: ['Up to 2 active events · 200 attendees · 1 seat'],
  },
  {
    name: 'Organizer Pro',
    price: '₹2,999',
    period: '/mo',
    sub: 'Build communities.',
    cta: 'Go Organizer Pro',
    to: null,
    plan: 'org_pro',
    features: [
      'Everything in Lite, unlimited',
      'Multiple organizers · matchmaking engine',
      'Cross-event attendee directory + insights',
      'Lead exports · sponsor management',
      'Revenue dashboard · custom branding',
      'White-label registration · API access',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'Run ecosystems.',
    cta: 'Request a demo',
    to: null,
    features: [
      'Dedicated account manager + SLA',
      'Bulk / branded NFC cards · SSO',
      'Private communities · recruitment mode',
      'CRM integrations · custom integrations',
      'Dedicated infrastructure',
    ],
  },
];

const Pricing = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppStore();

  const onSubscribe = async (plan: PlanKey) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }
    setBusy(plan);
    try {
      const ok = await startSubscription(plan, { email: user?.email });
      if (ok) toast.success('You’re subscribed — enjoy your new plan!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start checkout');
    } finally {
      setBusy(null);
    }
  };

  const body = (
    <>
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Pricing</h1>
          <p className="mt-2 text-muted-foreground">
            Free to join. Upgrade to network better, or host with organizer tools.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                t.highlight ? 'border-primary shadow-lg ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              {t.highlight && (
                <span className="self-start mb-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-foreground">{t.name}</h2>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{t.price}</span>
                {t.period && <span className="text-xs text-muted-foreground">{t.period}</span>}
              </p>
              <p className="text-sm text-muted-foreground mb-4">{t.sub}</p>
              <ul className="space-y-2 flex-1 mb-4">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              {t.limits && (
                <ul className="space-y-1 mb-5 border-t border-border pt-3">
                  {t.limits.map((l) => (
                    <li key={l} className="text-xs text-muted-foreground">{l}</li>
                  ))}
                </ul>
              )}
              {t.plan ? (
                <Button
                  className="w-full"
                  variant={t.highlight ? 'default' : 'outline'}
                  disabled={busy !== null}
                  onClick={() => onSubscribe(t.plan!)}
                >
                  {busy === t.plan ? 'Opening…' : t.cta}
                </Button>
              ) : t.to ? (
                <Button asChild className="w-full" variant={t.highlight ? 'default' : 'outline'}>
                  <Link to={t.to}>{t.cta}</Link>
                </Button>
              ) : (
                <Button className="w-full" variant="outline" onClick={() => setDemoOpen(true)}>
                  {t.cta}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* NFC Founder Card — one-time product, the easiest upsell */}
        <div className="mt-6 rounded-2xl border border-border p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">NFC Founder Card</h3>
              <p className="text-sm text-muted-foreground">
                Physical tap-to-connect card with QR fallback, dashboard & unlimited scans.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-sm text-foreground">
              <span className="font-bold">₹499</span> one-time
              <span className="text-muted-foreground"> · ₹999 metal</span>
            </p>
            <Button asChild size="sm">
              <Link to="/apply-card">Get a card</Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Paid ticket sales carry a 5–8% platform fee (free events are always free). Featured
          placement & sponsored networking available on request.
        </p>
    </>
  );

  // Signed-in users see pricing inside their portal chrome (keeps the nav);
  // anonymous visitors get the standalone marketing shell.
  if (isAuthenticated) {
    return (
      <PortalLayout>
        <div className="max-w-6xl mx-auto w-full pb-24 md:pb-8">
          {body}
        </div>
        <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      </PortalLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNav />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">{body}</main>
      <FeatureBento />
      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
};

export default Pricing;
