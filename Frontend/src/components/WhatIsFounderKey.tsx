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
import { HowItWorks } from '@/components/HowItWorks';
import { useAppStore } from '@/store/appStore';

const SEEN_KEY = 'fk:seen-explainer';

/**
 * One-time "What is FounderKey?" explainer for unauthenticated visitors who
 * land via a QR/NFC link (public card or event page) and may not know the
 * product. Shows once, then never again (localStorage).
 */
export const WhatIsFounderKey = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(() => setOpen(true), 900); // let the page paint first
    return () => clearTimeout(t);
  }, [isAuthenticated]);

  const dismiss = (o: boolean) => {
    if (!o) localStorage.setItem(SEEN_KEY, '1');
    setOpen(o);
  };

  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={dismiss}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> What is FounderKey?
          </DialogTitle>
          <DialogDescription>
            FounderKey turns event networking into a tap. Here's the gist:
          </DialogDescription>
        </DialogHeader>
        <HowItWorks compact />
        <div className="mt-2 flex gap-2">
          <Button asChild className="flex-1">
            <Link to="/register" onClick={() => localStorage.setItem(SEEN_KEY, '1')}>
              Get your own FounderKey
            </Link>
          </Button>
          <Button variant="outline" onClick={() => dismiss(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
