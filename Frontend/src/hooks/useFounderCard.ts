import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { founderCardService } from '@/services/founderCard.service';
import {
  paymentsService,
  loadRazorpayScript,
  openRazorpayCheckout,
  type ShippingAddress,
} from '@/services/payments.service';
import { toast } from 'sonner';

export const cardKeys = {
  mine: () => ['founder-card', 'mine'] as const,
  analytics: () => ['founder-card', 'analytics'] as const,
  public: (userId: string) => ['founder-card', 'public', userId] as const,
};

export function useMyCard() {
  return useQuery({
    queryKey: cardKeys.mine(),
    queryFn: () => founderCardService.getMyCard(),
    select: (res) => res.data,
  });
}

export function useCardAnalytics() {
  return useQuery({
    queryKey: cardKeys.analytics(),
    queryFn: () => founderCardService.getCardAnalytics(),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

export function usePublicCard(userId: string) {
  return useQuery({
    queryKey: cardKeys.public(userId),
    queryFn: () => founderCardService.getPublicCard(userId),
    select: (res) => res.data,
    enabled: !!userId,
  });
}

export function useApplyForCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => founderCardService.applyForCard(message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.mine() });
      toast.success('Application submitted! We\'ll review it shortly.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/**
 * Buy the physical NFC Tap Card: creates a Razorpay order, opens Checkout, and
 * on success verifies the payment (which activates the card). Pass the buyer's
 * name/email for the Checkout prefill.
 */
export function useBuyCard(prefill?: { name?: string; email?: string }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shippingAddress: ShippingAddress) => {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load the payment window. Check your connection.');

      const { data: order } = await paymentsService.createCardOrder(shippingAddress);

      await new Promise<void>((resolve, reject) => {
        openRazorpayCheckout({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'TapByWisein',
          description: 'NFC Tap Card',
          order_id: order.orderId,
          prefill: { name: prefill?.name, email: prefill?.email },
          theme: { color: '#1981FE' },
          handler: (resp) => {
            paymentsService
              .verifyCard({
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              })
              .then(() => resolve())
              .catch(reject);
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.mine() });
      toast.success('Payment successful. Your Tap Card is now active!');
    },
    onError: (err: Error) => {
      if (err.message === 'Payment cancelled') return; // user closed the modal
      toast.error(err.message);
    },
  });
}
