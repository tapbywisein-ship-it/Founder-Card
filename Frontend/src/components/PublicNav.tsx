import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';

/**
 * The single top nav for every public (shareable / logged-out-browsable) page:
 * brand + primary links + Sign in / Get started, or a Dashboard link when
 * already authenticated. `loginFrom` is the path to return to after auth;
 * defaults to the current URL so a visitor lands back where they were browsing.
 */
export function PublicNav({ loginFrom }: { loginFrom?: string }) {
  const [open, setOpen] = useState(false);
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

  const links = (
    <>
      <Link to="/discover" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setOpen(false)}>Discover</Link>
      <Link to="/communities" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setOpen(false)}>Communities</Link>
      <Link to="/ambassadors" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setOpen(false)}>Ambassadors</Link>
      <Link to="/pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setOpen(false)}>Pricing</Link>
    </>
  );

  const cta = isAuthenticated ? (
    <Button variant="outline" size="sm" asChild>
      <Link to={dashPath}>Dashboard</Link>
    </Button>
  ) : (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login" state={loginState}>Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/login" state={loginState}>Get started</Link>
      </Button>
    </>
  );

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-xwide mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo renders its own link (home for anon) — don't wrap it in another. */}
        <Logo />
        <div className="hidden md:flex items-center gap-6">{links}</div>
        <div className="hidden md:flex items-center gap-2">{cta}</div>
        <button
          className="md:hidden text-foreground"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden px-4 py-4 border-t border-border flex flex-col gap-4 bg-background">
          {links}
          <div className="flex items-center gap-2">{cta}</div>
        </div>
      )}
    </header>
  );
}
