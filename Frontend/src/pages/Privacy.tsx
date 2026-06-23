import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Privacy = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <header className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
      <Logo size="md" />
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Home
      </Link>
    </header>
    <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 prose-sm">
      <h1 className="text-3xl font-semibold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-6">Last updated: May 2026</p>

      <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">What we collect</h2>
          <p>
            When you create a FounderKey account we store your profile details (name, email, company,
            role, bio, skills, interests, and an optional photo), the events you register for, and the
            connections you make. Paid registrations are processed by Razorpay; we store the payment
            reference and amount, never your card details.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">How we use it</h2>
          <p>
            To run the networking platform — issue your Founder Card, match you with other founders,
            send event confirmations/reminders, and (with your consent) measure product usage to
            improve the experience.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Cookies & analytics</h2>
          <p>
            We only load analytics cookies after you accept the cookie banner. Decline and no tracking
            scripts run. You can change your choice by clearing site data.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Your rights</h2>
          <p>
            You can view and edit your profile anytime, block other users, and request account deletion.
            Contact us to exercise data-access or deletion rights under GDPR / India's DPDP Act.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Contact</h2>
          <p>
            Questions about privacy? Reach us via the support address in the app. See also our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
          </p>
        </section>
      </div>
    </main>
  </div>
);

export default Privacy;
