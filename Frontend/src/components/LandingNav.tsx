import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export const LandingNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-xwide mx-auto flex items-center justify-between h-16 px-6">
        <Logo />
        <div className="hidden md:flex items-center gap-3">
          <Button size="sm" asChild>
            <Link to="/login">Get started</Link>
          </Button>
        </div>
        <button
          className="md:hidden text-foreground"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden p-6 border-t border-border flex flex-col gap-4 bg-background">
          <Button size="sm" asChild><Link to="/login">Get started</Link></Button>
        </div>
      )}
    </nav>
  );
};
