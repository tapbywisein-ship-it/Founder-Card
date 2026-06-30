import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { apiGetMe } from '@/services/auth.service';
import { useAppStore } from '@/store/appStore';
import type { UserRole } from '@/store/appStore';
import { takePostAuthReturnPath } from '@/lib/loginReturnPath';

const ROLE_PATHS: Record<UserRole, string> = {
  attendee: '/dashboard',
  organizer: '/organizer/dashboard',
  admin: '/admin/dashboard',
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const called = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    // Supabase appends error details as hash params on failed OAuth/magic-link flows.
    const hash = new URLSearchParams(window.location.hash.replace('#', ''));
    const urlError = hash.get('error_description') ?? hash.get('error');
    // Also check query string (some flows use ?error=...)
    const query = new URLSearchParams(window.location.search);
    const queryError = query.get('error_description') ?? query.get('error');
    const oauthError = urlError ?? queryError;

    if (oauthError) {
      const msg = decodeURIComponent(oauthError).replace(/\+/g, ' ');
      console.error('[AuthCallback] OAuth error:', msg);
      setErrorMsg(msg);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        console.error('[AuthCallback] No session:', error?.message ?? 'missing');
        navigate('/login');
        return;
      }

      try {
        // Backend middleware auto-creates the user in DB on first call
        const user = await apiGetMe();
        login(user);

        const createIntent = localStorage.getItem('fk-oauth-create-intent');
        if (createIntent === '1') {
          localStorage.removeItem('fk-oauth-create-intent');
          navigate('/organizer/events/create');
          return;
        }

        const returnTo = takePostAuthReturnPath();
        navigate(returnTo ?? ROLE_PATHS[user.role] ?? '/dashboard');
      } catch (err) {
        console.error('[AuthCallback] apiGetMe failed:', err);
        navigate('/login');
      }
    });
  }, [login, navigate]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-lg font-semibold text-foreground">Sign-in failed</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-primary underline underline-offset-4"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
