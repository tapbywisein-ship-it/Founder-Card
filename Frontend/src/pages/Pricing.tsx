import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { RequestDemoModal } from '@/components/RequestDemoModal';

const TIERS = [
  {
    name: 'Free',
    price: '₹0',
    sub: 'For meetups & small events',
    cta: 'Start free',
    to: '/register',
    highlight: false,
    features: [
      'Unlimited free-ticket events',
      'Tap Cards + QR/NFC connect',
      'Attendee check-in',
      'Basic event analytics',
    ],
  },
  {
    name: 'Pro',
    price: '5%',
    sub: 'Per paid ticket — no monthly fee',
    cta: 'Create an event',
    to: '/organizer/events/create',
    highlight: true,
    features: [
      'Everything in Free',
      'Paid tickets via Razorpay',
      'Payout dashboard + invoices',
      'Promo codes & ticket tiers',
      'Email blasts & reminders',
    ],
  },
  {
    name: 'Enterprise',
    price: "Let's talk",
    sub: 'For conferences & series',
    cta: 'Request a demo',
    to: null,
    highlight: false,
    features: [
      'Everything in Pro',
      'Custom branding & domain',
      'Verified organizer badge',
      'Priority support',
    ],
  },
];

const Pricing = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-xwide mx-auto w-full">
        <Logo size="md" />
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Simple, event-friendly pricing</h1>
          <p className="mt-2 text-muted-foreground">Free to start. You only pay when you sell paid tickets.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
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
              <p className="mt-1 text-3xl font-bold text-foreground">{t.price}</p>
              <p className="text-xs text-muted-foreground mb-4">{t.sub}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              {t.to ? (
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

        <p className="text-center text-xs text-muted-foreground mt-8">
          The 5% platform fee applies only to paid ticket revenue. Free events are always free.
        </p>
      </main>

      <RequestDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
};

export default Pricing;
