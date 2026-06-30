import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';

/**
 * Floating one-tap share of the signed-in user's own Founder Card — no NFC
 * needed. Uses the Web Share sheet on mobile, clipboard copy elsewhere.
 */
export const QuickShareButton = () => {
  const user = useAppStore((s) => s.user);
  if (!user) return null;

  // Card link doubles as a referral link (?ref=<userId>) so sign-ups attribute.
  const url = `${window.location.origin}/card/${user.username || user.id}?ref=${user.id}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.name} · TapByWisein`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Your card link is copied');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share my Founder Card"
      title="Share my card"
      className="fixed z-50 right-4 bottom-20 md:bottom-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <Share2 className="h-5 w-5" />
    </button>
  );
};
