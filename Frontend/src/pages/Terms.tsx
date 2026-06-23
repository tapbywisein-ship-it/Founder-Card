import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Terms = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
      <Logo size="md" />
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>
    </header>
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
      <h1 className="text-3xl font-semibold text-foreground mb-2">Terms of Service</h1>
      <p className="text-xs text-muted-foreground mb-6">Last updated: May 2026</p>

      <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Using FounderKey</h2>
          <p>
            FounderKey is an NFC/QR event-networking platform for founders. You're responsible for the
            accuracy of your profile and for using the platform lawfully and respectfully. We may
            suspend accounts that abuse the service or other members.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Events & tickets</h2>
          <p>
            Organizers set their own event details, ticket tiers, and prices. Paid tickets are sold via
            Razorpay. Refunds for attendee cancellations and organizer-cancelled events are returned to
            the original payment method per the refund flow.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Content & conduct</h2>
          <p>
            Don't upload unlawful or infringing content, impersonate others, or scrape the platform.
            Reported content and users are reviewed by our moderation team.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Liability</h2>
          <p>
            The platform is provided "as is." We aren't liable for the conduct of other users or for
            event outcomes. Your use is at your own discretion.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">More</h2>
          <p>
            See our{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for how we
            handle your data.
          </p>
        </section>
      </div>
    </main>
  </div>
);

export default Terms;
