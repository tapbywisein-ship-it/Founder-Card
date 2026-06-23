import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { useAppStore, type UserRole } from '@/store/appStore';
import { apiLogin } from '@/services/auth.service';
import { setTokens } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  getLoginReturnPathname,
  safePublicEventReturnPath,
  getReturnPathFromSearch,
  setPostAuthReturnPath,
} from '@/lib/loginReturnPath';

const ROLE_PATHS: Record<UserRole, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};

/**
 * Login — email + password, with Google OAuth as a parallel option.
 *
 * Same email always = same account regardless of which path you choose.
 * Demo-mode fallback (when backend is offline) uses mockAttendee.
 */
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Deep-link support: respect both `location.state.from` (ProtectedRoute
  // redirect) and `?from=/some/path` on the URL (shareable login link).
  // The state-based path keeps its strict /e/:slug check; the query-string
  // path goes through the broader same-origin guard in safeAppReturnPath.
  const rawFrom = getLoginReturnPathname(location.state);
  const returnPath =
    safePublicEventReturnPath(rawFrom) ?? getReturnPathFromSearch(location.search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAppStore((s) => s.login);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentRole = useAppStore((s) => s.user?.role);

  // Already signed in? Don't show the login form — go straight to the app.
  if (isAuthenticated) {
    return <Navigate to={ROLE_PATHS[(currentRole as UserRole) ?? 'attendee'] ?? '/dashboard'} replace />;
  }

  const goAfterAuth = (role: UserRole) => {
    navigate(returnPath ?? ROLE_PATHS[role]);
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    // Trim leading/trailing whitespace — copy-paste from emails / chat /
    // password managers frequently appends a stray space, which would
    // silently fail the bcrypt compare on the backend.
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) return;
    setLoading(true);
    try {
      const { user, tokens } = await apiLogin(cleanEmail, cleanPassword);
      setTokens(tokens.accessToken, tokens.refreshToken);
      login(user);
      toast.success('Welcome back');
      goAfterAuth(user.role);
    } catch (err) {
      // Surface the real error — no silent demo-mode fallback. Wrong
      // password / unreachable backend should both show up so the user
      // can act on it instead of being mysteriously signed in as a stub.
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (returnPath) setPostAuthReturnPath(returnPath);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-xwide mx-auto w-full">
        <Logo size="md" />
        <Link
          to={returnPath ?? '/'}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {returnPath ? 'Back to event' : 'Back to home'}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to Founder Key
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your email and password, or continue with Google.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="login-pw">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-pw"
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
              size="lg"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleLogin}
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

          <p className="text-center text-sm text-muted-foreground">
            New to Founder Key?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
