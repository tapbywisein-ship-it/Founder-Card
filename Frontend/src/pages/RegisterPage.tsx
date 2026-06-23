import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, ArrowLeft, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAppStore } from '@/store/appStore';
import { apiRegister } from '@/services/auth.service';
import { setTokens } from '@/services/api';
import { toast } from 'sonner';

/**
 * Sign-up — Luma-style single-step.
 *
 * Phase 2 dropped the role selector + multi-step onboarding. New users default
 * to attendee; they can become an organizer later from settings (planned).
 *
 * The full-name field is split into firstName/lastName for the backend
 * (`apiRegister` expects them as separate fields).
 */
const ROLE_HOME: Record<string, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAppStore((s) => s.login);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentRole = useAppStore((s) => s.user?.role);

  // Already signed in? Skip the signup form.
  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[currentRole ?? 'attendee'] ?? '/dashboard'} replace />;
  }

  // Routed from SignInModal's "Create an account" link with the original
  // intent: where the user wanted to go (e.g. /organizer/events/create) and
  // which role to register them as for that intent.
  const navState = (location.state ?? {}) as {
    from?: { pathname?: string };
    signupRole?: 'ATTENDEE' | 'ORGANIZER';
  };
  const intendedRoute = navState.from?.pathname;
  const signupRole = navState.signupRole;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    // Match backend requirements: 8+ chars, upper + lower + digit + special.
    const pwOk =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!pwOk) {
      toast.error('Password must be 8+ chars with upper, lower, number & special character');
      return;
    }
    setSubmitting(true);
    try {
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || firstName;
      const { user, tokens } = await apiRegister({
        email,
        password,
        firstName,
        lastName,
        role: signupRole,
      });
      setTokens(tokens.accessToken, tokens.refreshToken);
      login({ ...user, name: name.trim() });
      toast.success('Account created');
      navigate(intendedRoute ?? '/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-xwide mx-auto w-full">
        <Logo size="md" />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Join the network of founders. Free to start, no credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Full name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Alex Chen"
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="8+ chars, mix of letters, numbers & symbols"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  disabled={submitting}
                  required
                  minLength={8}
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
              <p className="text-xs text-muted-foreground">
                At least 8 characters with one uppercase, one lowercase, one number,
                and one special character.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !name.trim() || !email || !password}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our Terms and Privacy Policy.
          </p>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
