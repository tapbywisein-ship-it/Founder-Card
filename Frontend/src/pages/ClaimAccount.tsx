import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/appStore';
import {
  apiClaimAccount,
  apiValidateClaim,
} from '@/services/auth.service';

const passwordOk = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

const ClaimAccountPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);

  const validate = useQuery({
    queryKey: ['claim-token', token],
    queryFn: () => apiValidateClaim(token!),
    enabled: !!token,
    retry: false,
  });

  const claim = useMutation({
    mutationFn: () => apiClaimAccount(token!, password),
    onSuccess: ({ user }) => {
      login(user);
      toast.success('Account claimed! Sign in to continue.');
      navigate('/login');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not claim account'),
  });

  useEffect(() => {
    if (validate.isError && validate.error instanceof Error) {
      toast.error(validate.error.message);
    }
  }, [validate.isError, validate.error]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!passwordOk(password)) {
      toast.error('Password must be 8+ chars with upper, lower, number, and a symbol');
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    claim.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-xwide items-center justify-between px-6 py-5">
        <Logo size="md" />
      </header>
      <main className="mx-auto w-full max-w-md px-6 pb-16">
        <Surface padding="lg">
          {validate.isLoading && (
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking your invite…</p>
            </div>
          )}

          {validate.isError && (
            <div className="text-center">
              <h1 className="mb-1 text-xl font-semibold text-foreground">Invite link is invalid</h1>
              <p className="text-sm text-muted-foreground">
                {validate.error instanceof Error
                  ? validate.error.message
                  : 'Ask your organizer to resend the invitation.'}
              </p>
              <Button className="mt-5" onClick={() => navigate('/login')}>
                Sign in instead
              </Button>
            </div>
          )}

          {validate.data && (
            <>
              <div className="mb-5 text-center">
                <KeyRound className="mx-auto mb-2 h-7 w-7 text-primary" />
                <h1 className="text-2xl font-semibold text-foreground">Claim your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set a password for{' '}
                  <span className="font-medium text-foreground">{validate.data.email}</span>
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="pw">Password</Label>
                  <div className="relative">
                    <Input
                      id="pw"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    8+ chars, upper, lower, number, symbol.
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!passwordOk(password) || password !== confirm || claim.isPending}
                >
                  {claim.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {claim.isPending ? 'Setting password…' : 'Claim account'}
                </Button>
              </form>
            </>
          )}
        </Surface>
      </main>
    </div>
  );
};

export default ClaimAccountPage;
