import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { membershipService } from '@/services/membership.service';
import { useMyProfile } from '@/hooks/useProfile';

const LABEL: Record<string, string> = {
  FREE: 'Free',
  free: 'Free',
  FOUNDER: 'Tap Pro',
  founder: 'Tap Pro',
  PRO: 'Tap Pro',
  ORGANIZER_LITE: 'Organizer Lite',
  ORGANIZER_PRO: 'Organizer Pro',
  ENTERPRISE: 'Enterprise',
};
const PAID = new Set(['PRO', 'FOUNDER', 'founder', 'ORGANIZER_LITE', 'ORGANIZER_PRO', 'ENTERPRISE']);

/** Current plan + upgrade/cancel — the in-app entry point to paid tiers. */
export const PlanSection = () => {
  const qc = useQueryClient();
  const { data: me } = useMyProfile();
  const tier = me?.tier ?? 'FREE';
  const isPaid = PAID.has(tier);

  const { data: mine } = useQuery({
    queryKey: ['membership'],
    queryFn: () => membershipService.getMine(),
    select: (r) => r.data,
    enabled: isPaid, // only the billing summary matters for paid users
  });

  const cancel = useMutation({
    mutationFn: () => membershipService.cancel(),
    onSuccess: () => {
      toast.success('Your plan will end at the current period close');
      qc.invalidateQueries({ queryKey: ['membership'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewal = mine?.currentPeriodEnd
    ? new Date(mine.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <Surface className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Crown className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {LABEL[tier] ?? tier} plan
          </p>
          <p className="text-xs text-muted-foreground">
            {isPaid
              ? renewal
                ? `Renews ${renewal}`
                : 'Active'
              : 'Upgrade to unlock lead capture, CRM, analytics and more.'}
          </p>
        </div>
      </div>
      {isPaid ? (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? 'Cancelling…' : 'Cancel plan'}
        </Button>
      ) : (
        <Button size="sm" className="shrink-0" asChild>
          <Link to="/pricing">Upgrade</Link>
        </Button>
      )}
    </Surface>
  );
};
