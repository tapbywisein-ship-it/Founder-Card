import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { eventsService } from '@/services/events.service';
import { useSetCheckedInEventId } from '@/lib/useActiveEvent';

/**
 * Self check-in landing page hit when a user scans the event's check-in QR
 * poster. Auth is required by the backend so we redirect to /login (with the
 * current URL as `from`) when the user isn't signed in.
 */
const CheckInLanding = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setCheckedInEventId = useSetCheckedInEventId();
  const [state, setState] = useState<'pending' | 'success' | 'already' | 'error'>('pending');
  const [eventInfo, setEventInfo] = useState<{ id: string; title: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/checkin/${token}` } } });
      return;
    }
    if (fired.current) return;
    fired.current = true;
    eventsService
      .selfCheckIn(token)
      .then((res) => {
        setEventInfo(res.data.event);
        setCheckedInEventId(res.data.event.id);
        setState(res.data.alreadyCheckedIn ? 'already' : 'success');
        toast.success(res.data.alreadyCheckedIn ? "You're already checked in" : 'Checked in!');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Could not check in';
        setErrorMsg(msg);
        setState('error');
      });
  }, [token, isAuthenticated, navigate, setCheckedInEventId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-xwide items-center justify-between px-6 py-5">
        <Logo size="md" />
      </header>
      <main className="mx-auto w-full max-w-md px-6 pb-16">
        <Surface padding="lg" className="text-center">
          {state === 'pending' && (
            <>
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking you in…</p>
            </>
          )}
          {(state === 'success' || state === 'already') && eventInfo && (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground">
                {state === 'success' ? "You're in!" : 'Already checked in'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome to <span className="font-semibold text-foreground">{eventInfo.title}</span>
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => navigate(`/event/${eventInfo.id}/attendees`)}>
                  See who's here
                </Button>
                <Button variant="outline" onClick={() => navigate(`/event/${eventInfo.id}`)}>
                  Event details
                </Button>
              </div>
            </>
          )}
          {state === 'error' && (
            <>
              <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
              <h1 className="text-xl font-semibold text-foreground">Couldn't check in</h1>
              <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
              <div className="mt-6 flex flex-col gap-2">
                <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
              </div>
            </>
          )}
        </Surface>
      </main>
    </div>
  );
};

export default CheckInLanding;
