import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { apiVerifyEmail } from '@/services/auth.service';

type State = 'verifying' | 'success' | 'error';

/** Consumes the ?token= from the verification email and confirms it server-side. */
const VerifyEmail = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState('error');
      setMessage('This verification link is invalid or incomplete.');
      return;
    }
    apiVerifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setMessage(
          err instanceof Error ? err.message : 'This link is invalid or has expired.'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-xwide mx-auto w-full">
        <Logo size="md" />
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center space-y-4">
          {state === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Verifying your email…
              </h1>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Email verified!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your email is confirmed. You can now sign in to Founder Key.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Continue to sign in</Link>
              </Button>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Verification failed
              </h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyEmail;
