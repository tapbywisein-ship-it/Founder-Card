import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'fk:install-prompt-dismissed';
const SHOW_AFTER_MS = 30_000;

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    // iOS: navigator.standalone is non-standard but reliable
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));

const isIOSSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /^((?!chrome|crios|fxios).)*safari/i.test(ua);
  return isIOS && isSafari;
};

/**
 * Floating install prompt. On Android Chrome we listen for the native
 * `beforeinstallprompt` event and trigger it when the user taps "Install."
 * On iOS Safari (which has no API), we render a hint pointing at the share
 * → "Add to Home Screen" flow.
 *
 * Hidden when the app is already installed (display-mode: standalone) or the
 * user has dismissed the prompt in the last 30 days.
 */
export const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < 30 * 24 * 60 * 60 * 1000) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);

    // Android fires the event; iOS doesn't, so we reveal the manual hint after
    // the same delay if the user is on iOS Safari.
    if (isIOSSafari()) {
      timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, SHOW_AFTER_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      dismiss();
    } else {
      // User said "not now" — back off for 7 days instead of 30.
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() - 23 * 24 * 60 * 60 * 1000)
      );
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install TapByWisein"
      className="fixed bottom-4 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card border border-border bg-card p-4 shadow-card"
    >
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install TapByWisein</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap{' '}
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-1 py-0.5">
                <Share className="h-3 w-3" /> Share
              </span>{' '}
              then <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Get one-tap access to your card, scanner, and events.
            </p>
          )}
          {!iosHint && (
            <Button size="sm" className="mt-3" onClick={install} disabled={!deferred}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
