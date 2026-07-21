import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, MapPin, Award } from 'lucide-react';
import { publicService } from '@/services/public.service';
import { Surface } from '@/components/Surface';

// Live social-proof bar backed by real DB counts (`GET /public/stats`).
// ambassadors stays 0 until the Ambassador program ships — hidden while 0 so
// the bar never shows a dead "0 ambassadors" stat.
export const StatsBar = () => {
  const { data: stats } = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => publicService.getStats(),
    select: (r) => r.data,
    staleTime: 5 * 60 * 1000,
  });

  const fmt = (n: number) => n.toLocaleString('en-IN');
  const items = [
    { icon: Users, label: 'Members', value: stats?.founders },
    { icon: Calendar, label: 'Events hosted', value: stats?.events },
    { icon: MapPin, label: 'Cities', value: stats?.cities },
    { icon: Award, label: 'Ambassadors', value: stats?.ambassadors },
  ].filter((s) => (s.value ?? 0) > 0 || s.label !== 'Ambassadors');

  return (
    <Surface className="p-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center justify-center gap-1 px-4 py-4 text-center">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-xl font-semibold text-foreground tabular-nums">
              {value == null ? '—' : fmt(value)}
            </span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
};
