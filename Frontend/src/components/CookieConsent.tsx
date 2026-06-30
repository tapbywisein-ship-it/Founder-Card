import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getConsent, setConsent, loadAnalytics } from '@/lib/analytics';

/**
 * GDPR/PDPB cookie-consent banner, shown to every visitor who hasn't decided
 * yet. On "Accept", any configured analytics load (no-op until env IDs are
 * set); on "Decline", nothing tracks. Returning users who accepted get
 * analytics loaded silently and don't see the banner again.
 */
export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = getConsent();
    if (choice === 'granted') loadAnalytics();
    else if (choice === null) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 md:p-4">
      <div className="max-w-3xl mx-auto rounded-xl border border-border bg-card shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies for analytics to improve TapByWisein. You can accept or decline. See our{' '}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConsent('denied');
              setVisible(false);
            }}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setConsent('granted');
              setVisible(false);
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};
