import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';

const SEEN_KEY = 'fk:exit-intent-seen';

/**
 * Exit-intent capture for first-time, unauthenticated landing visitors. Fires
 * once when the cursor leaves the top of the viewport (desktop), nudging a
 * sign-up. Shown at most once per browser.
 */
export const ExitIntentPopup = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated || localStorage.getItem(SEEN_KEY)) return;
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        localStorage.setItem(SEEN_KEY, '1');
        setOpen(true);
        document.removeEventListener('mouseleave', onLeave);
      }
    };
    // Delay arming so it can't fire on initial load.
    const t = setTimeout(() => document.addEventListener('mouseleave', onLeave), 6000);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [isAuthenticated]);

  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Before you go…
          </DialogTitle>
          <DialogDescription>
            Attending an event soon? Set up your Founder Card in 30 seconds and connect instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild>
            <Link to="/register" onClick={() => setOpen(false)}>Create my Founder Card</Link>
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>No thanks</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
