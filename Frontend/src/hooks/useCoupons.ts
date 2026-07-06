import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { couponsService, type CreateCouponPayload } from '@/services/coupons.service';

const key = (eventId: string) => ['organizer', 'coupons', eventId] as const;

export function useCoupons(eventId: string) {
  return useQuery({
    queryKey: key(eventId),
    queryFn: () => couponsService.list(eventId),
    select: (res) => res.data,
    enabled: !!eventId,
  });
}

export function useCreateCoupon(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => couponsService.create(eventId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(eventId) });
      toast.success('Coupon created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCoupon(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (couponId: string) => couponsService.remove(eventId, couponId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(eventId) });
      toast.success('Coupon deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
