import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  membershipService,
  openSubscriptionCheckout,
  type PlanKey,
} from '@/services/membership.service';
import { useAppStore } from '@/store/appStore';

export function useMembership() {
  return useQuery({
    queryKey: ['membership'],
    queryFn: () => membershipService.getMine(),
    select: (res) => res.data,
    staleTime: 60_000,
  });
}

/** True when the signed-in user currently has member perks. Cheap read off the
 *  cached membership query — components can gate UI without their own fetch. */
export function useIsMember() {
  const { data } = useMembership();
  return data?.isActive ?? false;
}

export function useSubscribe() {
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  return useMutation({
    mutationFn: async (plan: PlanKey) => {
      const { data: init } = await membershipService.subscribe(plan);
      await openSubscriptionCheckout(init, {
        name: user?.name,
        email: user?.email,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership'] });
      qc.invalidateQueries({ queryKey: ['connections', 'follow-ups'] });
      toast.success('Welcome to Founder membership 🎉');
    },
    onError: (err: Error) => {
      if (err.message === 'Payment cancelled') return;
      toast.error(err.message);
    },
  });
}

export function useCancelMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => membershipService.cancel(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['membership'] });
      toast.success('Membership will end at the close of your billing period');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
