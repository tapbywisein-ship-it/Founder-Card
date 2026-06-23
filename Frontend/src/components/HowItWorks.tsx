import { Nfc, IdCard, Handshake } from 'lucide-react';

const STEPS = [
  {
    icon: Nfc,
    title: 'Tap or scan',
    body: "Tap an NFC card or scan a QR code to open a founder's digital card instantly — no app install, no typing.",
  },
  {
    icon: IdCard,
    title: 'See their card',
    body: 'View who they are, what they’re building, and what they’re looking for — all on one Founder Card.',
  },
  {
    icon: Handshake,
    title: 'Connect & follow up',
    body: 'Send a connection in one tap, then message and follow up after the event. Your network, captured.',
  },
];

/** Reusable "NFC tap → profile → connect" explainer. Used in onboarding and the
 *  "What is FounderKey?" modal. */
export const HowItWorks = ({ compact = false }: { compact?: boolean }) => (
  <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-3'}>
    {STEPS.map((s, i) => (
      <div
        key={s.title}
        className={`rounded-xl border border-border bg-muted/30 p-4 ${compact ? 'flex items-start gap-3' : 'text-center'}`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ${compact ? 'shrink-0' : 'mx-auto mb-2'}`}
        >
          <s.icon className="h-5 w-5 text-primary" />
        </div>
        <div className={compact ? '' : 'mt-1'}>
          <p className="text-sm font-semibold text-foreground">
            {i + 1}. {s.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
        </div>
      </div>
    ))}
  </div>
);
