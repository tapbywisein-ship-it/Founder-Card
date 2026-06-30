import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store/appStore';
import { apiGetMe } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to send the user after successful sign-in. */
  intendedRoute?: string;
  title?: string;
  description?: string;
}

/**
 * Auth-gate sign-in modal — Luma's pattern for "click Create, get prompted to sign in."
 *
 * Email + password sign-in with Google OAuth as a parallel option. New users
 * are routed to the full /register page via the "Create an account" link.
 */
export const SignInModal = ({
  open,
  onOpenChange,
  intendedRoute,
  title = 'Welcome to TapByWisein',
  description = 'Sign in to continue.',
}: SignInModalProps) => {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail('');
    setPassword('');
    setShowPw(false);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return;
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
      if (signInError) throw new Error(signInError.message);
      const user = await apiGetMe();
      login(user);
      toast.success('Signed in');
      onOpenChange(false);
      reset();
      // Admins always go to their own dashboard — never into organizer flows.
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (intendedRoute) {
        navigate(intendedRoute);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      if (intendedRoute === '/organizer/events/create') {
        // Tell AuthCallback to (a) register new users as ORGANIZER and
        // (b) forward to the create-event page after sign-in.
        localStorage.setItem('fk-oauth-create-intent', '1');
        localStorage.setItem('fk-oauth-role', 'organizer');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignIn} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="signin-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="signin-email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signin-pw">Password</Label>
            <div className="relative">
              <Input
                id="signin-pw"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-3">
          New to TapByWisein?{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              onOpenChange(false);
              reset();
              navigate('/register', {
                state: {
                  from: intendedRoute ? { pathname: intendedRoute } : undefined,
                  signupRole:
                    intendedRoute === '/organizer/events/create'
                      ? 'ORGANIZER'
                      : undefined,
                },
              });
            }}
          >
            Create an account →
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};
