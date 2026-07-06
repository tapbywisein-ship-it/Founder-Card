import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/Surface';
import { pushSupported, getPushState, enablePush, disablePush, type PushState } from '@/lib/push';

/**
 * Push-notification opt-in card. Requests permission + subscribes this browser
 * (persisted server-side), or unsubscribes. No-ops gracefully on unsupported
 * browsers / when the server has no VAPID keys.
 */
export const PushOptIn = () => {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setState('unsupported');
      return;
    }
    getPushState().then(setState).catch(() => setState('default'));
  }, []);

  if (state === 'unsupported') return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (state === 'subscribed') {
        await disablePush();
        setState('default');
        toast.success('Push notifications turned off');
      } else {
        await enablePush();
        setState('subscribed');
        toast.success('Push notifications enabled');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update notifications');
      setState(await getPushState().catch(() => 'default'));
    } finally {
      setBusy(false);
    }
  };

  const subscribed = state === 'subscribed';
  const denied = state === 'denied';

  return (
    <Surface className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          {subscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Push notifications</p>
          <p className="text-xs text-muted-foreground">
            {denied
              ? 'Blocked in your browser settings — re-enable them there to turn on.'
              : subscribed
                ? 'On for this device. Get pinged for connections, messages & event updates.'
                : 'Get pinged for connections, messages & event updates.'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant={subscribed ? 'outline' : 'default'}
        onClick={toggle}
        disabled={busy || denied}
      >
        {busy ? '…' : subscribed ? 'Turn off' : 'Enable'}
      </Button>
    </Surface>
  );
};
