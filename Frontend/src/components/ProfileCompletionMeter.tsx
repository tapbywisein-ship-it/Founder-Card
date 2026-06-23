import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { profileCompletion } from '@/lib/profileCompletion';
import { useMyProfile } from '@/hooks/useProfile';

interface ProfileCompletionMeterProps {
  /** Called when user clicks "Complete profile" — opens the onboarding wizard. */
  onResume: () => void;
}

/**
 * Dashboard widget that surfaces how complete the profile is. Hides itself
 * once the score reaches 100 so successful users don't see noise.
 */
export const ProfileCompletionMeter = ({ onResume }: ProfileCompletionMeterProps) => {
  const { data } = useMyProfile();
  const pct = profileCompletion(data?.profile);

  if (pct >= 100) return null;

  return (
    <Surface className="flex items-center gap-4">
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
          <circle cx="18" cy="18" r="16" stroke="currentColor" className="text-muted/40" strokeWidth="3" fill="none" />
          <motion.circle
            cx="18"
            cy="18"
            r="16"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="3"
            strokeDasharray={`${(pct / 100) * 100.5} 100.5`}
            strokeLinecap="round"
            fill="none"
            initial={{ strokeDasharray: '0 100.5' }}
            animate={{ strokeDasharray: `${(pct / 100) * 100.5} 100.5` }}
            transition={{ duration: 0.8 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums text-foreground">
          {pct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Finish your profile</p>
        <p className="text-xs text-muted-foreground">
          {pct < 50
            ? 'Add skills + interests so you can be matched at events.'
            : 'Almost there — just a few more details.'}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onResume} className="shrink-0">
        Complete <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    </Surface>
  );
};
