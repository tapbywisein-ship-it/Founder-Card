import { Badge } from '@/components/ui/badge';
import { Star, Mic, Wrench, Crown, Sparkles } from 'lucide-react';
import type { EventRole } from '@/services/events.service';

const styles: Record<
  EventRole,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  VIP: {
    label: 'VIP',
    icon: Crown,
    cls: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  },
  SPEAKER: {
    label: 'Speaker',
    icon: Mic,
    cls: 'bg-violet-50 text-violet-900 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900',
  },
  STAFF: {
    label: 'Staff',
    icon: Wrench,
    cls: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900',
  },
  SPONSOR: {
    label: 'Sponsor',
    icon: Sparkles,
    cls: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  },
  ATTENDEE: {
    label: 'Attendee',
    icon: Star,
    cls: 'bg-secondary text-foreground border-border',
  },
};

interface RoleBadgeProps {
  role: EventRole;
  /** ATTENDEE role renders nothing by default; pass true to force-show. */
  showAttendee?: boolean;
  className?: string;
}

export const RoleBadge = ({ role, showAttendee = false, className = '' }: RoleBadgeProps) => {
  if (role === 'ATTENDEE' && !showAttendee) return null;
  const s = styles[role];
  const Icon = s.icon;
  return (
    <Badge variant="outline" className={`gap-1 px-2 py-0 text-[10px] ${s.cls} ${className}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
};
