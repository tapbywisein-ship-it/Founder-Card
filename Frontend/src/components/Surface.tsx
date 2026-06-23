import { forwardRef, type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Apply heavier shadow stack (Luma's full 5-layer card shadow) */
  elevated?: boolean;
  /** Padding scale; default 'md' */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Add a subtle hover lift — used for clickable cards. */
  hover?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
};

/**
 * Surface — a clean Luma-style card wrapper.
 *
 * Replaces the legacy GlassCard component. Uses the design tokens introduced
 * in Phase 1 (bg-card, border-border, rounded-card, shadow-card / shadow-card-xs).
 * The Phase 2 codemod rewrites `<GlassCard>` JSX tags to `<Surface>`.
 */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ children, className, elevated = false, padding = 'md', hover = false, ...rest }, ref) => {
    const base = elevated
      ? 'bg-card border border-border rounded-card shadow-card'
      : 'bg-card border border-border rounded-card shadow-card-xs';
    const hoverCls = hover
      ? 'transition-all hover:-translate-y-0.5 hover:shadow-card hover:border-primary/30'
      : '';
    return (
      <div ref={ref} className={cn(base, paddingMap[padding], hoverCls, className)} {...rest}>
        {children}
      </div>
    );
  }
);
Surface.displayName = 'Surface';
