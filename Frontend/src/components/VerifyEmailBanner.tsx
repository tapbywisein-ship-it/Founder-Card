import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Soft email-verification gate. Shows a persistent banner to signed-in users
 * whose email isn't verified yet, with a Resend button. Browsing stays open;
 * sensitive actions (registering, messaging) check `user.isEmailVerified`
 * separately via `requireVerifiedEmail`.
 */
export const VerifyEmailBanner = () => {
  const user = useAppStore((s) => s.user);
  const [sending, setSending] = useState(false);

  // Only show for signed-in users we know are unverified.
  if (!user || user.isEmailVerified !== false) return null;

  const resend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) throw new Error(error.message);
      toast.success('Verification email sent, check your inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60">
      <div className="max-w-xwide mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <MailWarning className="w-4 h-4 shrink-0" />
          <span>
            Please verify your email to register for events and message connections.
          </span>
        </div>
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="shrink-0 text-sm font-medium text-amber-900 dark:text-amber-100 underline underline-offset-2 hover:no-underline disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      </div>
    </div>
  );
};

/**
 * Guard for sensitive actions. Returns true if the user may proceed; otherwise
 * shows a toast and returns false. Use at the top of register / message handlers.
 */
export const requireVerifiedEmail = (
  user: { isEmailVerified?: boolean } | null
): boolean => {
  if (user && user.isEmailVerified === false) {
    toast.error('Please verify your email first. Check your inbox for the link.');
    return false;
  }
  return true;
};
