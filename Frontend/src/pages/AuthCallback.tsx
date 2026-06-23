import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { apiGoogleVerify } from '@/services/auth.service';
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

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    // Role is NEVER passed through OAuth callback — an XSS-stuffed localStorage
    // value would otherwise flow to the backend and could be honored on first
    // sign-up. New OAuth users default to ATTENDEE on the server; existing
    // users keep their role. Role changes happen in /settings or by an admin.
    localStorage.removeItem('fk-oauth-role');

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error || !session) {
        console.error('[AuthCallback] OAuth session error:', error?.message ?? 'No session');
        navigate('/login');
        return;
      }

      try {
        const { user } = await apiGoogleVerify(session.access_token);
        console.log('[AuthCallback] Verified user — role:', user.role, '→ navigating to:', ROLE_PATHS[user.role]);
        login(user);

        // Phase 2: drop the /onboarding/phone interrupt — phone is now an
        // optional profile field, not a forced post-signup step.

        // Honor the auth-gate "Create Event" intent first if present.
        const createIntent = localStorage.getItem('fk-oauth-create-intent');
        if (createIntent === '1') {
          localStorage.removeItem('fk-oauth-create-intent');
          navigate('/organizer/events/create');
          return;
        }

        // Fall back to the standard return-path / role-default routing.
        const returnTo = takePostAuthReturnPath();
        if (returnTo) {
          navigate(returnTo);
          return;
        }

        navigate(ROLE_PATHS[user.role] ?? '/dashboard');
      } catch (err) {
        console.error('[AuthCallback] Google verify failed:', err);
        navigate('/login');
      }
    });
  }, [login, navigate]);

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
