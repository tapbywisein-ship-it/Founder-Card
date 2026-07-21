import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';

/**
 * Minimal top nav for public (shareable / logged-out-browsable) pages: brand +
 * Sign in / Get started, or a Dashboard link when already authenticated.
 * `loginFrom` is the path to return to after auth; defaults to the current URL
 * so a visitor lands back where they were browsing.
 */
export function PublicNav({ loginFrom }: { loginFrom?: string }) {
  const { isAuthenticated, user } = useAppStore();
  const dashPath =
    user?.role === 'organizer'
      ? '/organizer/dashboard'
      : user?.role === 'admin'
        ? '/admin/dashboard'
        : '/dashboard';
  const loginState = {
    from: { pathname: loginFrom ?? window.location.pathname + window.location.search },
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-content mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo renders its own link (home for anon) — don't wrap it in another. */}
        <Logo />
        {/* Same primary links as the landing nav, so public pages share one navbar. */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/discover" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Discover</Link>
          <Link to="/communities" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Communities</Link>
          <Link to="/ambassadors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Ambassadors</Link>
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
          <a href="/#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={dashPath}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login" state={loginState}>
                  Sign in
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/login" state={loginState}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
