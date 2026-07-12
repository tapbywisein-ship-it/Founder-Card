import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Navbar variant: pinned to the viewport's top-right like a header control.
 * The app layouts have no top bar on desktop — this gives the toggle a
 * consistent, always-visible navbar position instead of being tucked at the
 * bottom of the collapsed sidebar. Desktop-only: on mobile it would overlap
 * page-header actions, and the attendee mobile top bar has its own toggle
 * (organizer/admin mobile never had one — unchanged).
 */
export const NavbarThemeToggle = ({ className = '' }: { className?: string }) => (
  <div
    className={`hidden md:block fixed top-3 right-3 z-40 rounded-full border border-border bg-background/80 backdrop-blur-md shadow-sm ${className}`}
  >
    <ThemeToggle />
  </div>
);

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  const current = theme === 'system' ? resolvedTheme : theme;
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {current === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
