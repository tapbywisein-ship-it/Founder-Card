import { useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { SignInModal } from '@/components/SignInModal';

interface UseAuthGateResult {
  /**
   * Either navigate immediately (if authenticated) or open the
   * SignInModal with the intent of routing to `route` after sign-in.
   */
  requireAuth: (route: string) => void;
  /** JSX element to render in the consumer's tree. Renders nothing visible
   *  until requireAuth is called for an unauthenticated user. */
  modal: ReactNode;
}

/**
 * Auth-gate hook — Luma's "click Create, get prompted to sign in" pattern.
 *
 * Usage:
 *   const { requireAuth, modal } = useAuthGate();
 *   ...
 *   <button onClick={() => requireAuth('/organizer/events/create')}>Create</button>
 *   {modal}
 */
export const useAuthGate = (): UseAuthGateResult => {
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | undefined>();

  const requireAuth = useCallback(
    (route: string) => {
      if (isAuthenticated) {
        navigate(route);
      } else {
        setIntendedRoute(route);
        setOpen(true);
      }
    },
    [isAuthenticated, navigate]
  );

  return {
    requireAuth,
    modal: (
      <SignInModal
        open={open}
        onOpenChange={setOpen}
        intendedRoute={intendedRoute}
      />
    ),
  };
};
