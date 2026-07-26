import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ParticleWordmark } from '@/components/ParticleWordmark';

/**
 * Shared minimal footer for public marketing pages — light, Luma-style.
 * Replaces the dark inline footer that used to live in LandingPage.
 */
export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-xwide mx-auto px-6 pt-10 overflow-hidden">
        <ParticleWordmark
          text="TAPBY WISEIN"
          className="select-none"
          dotColor="rgba(0,0,0,0.35)"
          accentText="WISEIN"
          accentColor="rgba(25,129,254,0.7)"
        />
      </div>
      <div className="max-w-xwide mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <Logo />
          <span className="text-xs text-muted-foreground">© {year} TapByWisein</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
          <Link to="/discover" className="text-muted-foreground transition-colors hover:text-foreground">Discover</Link>
          <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Terms and Conditions</Link>
          <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">Refund Policy</Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="max-w-xwide mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {year} TapByWisein™. All rights reserved.</span>
          <span>Powered by Sanshi Network Tech Pvt. Ltd.</span>
        </div>
      </div>
    </footer>
  );
}
