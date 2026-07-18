import { apiFetch } from './api';
import { loadRazorpayScript } from './payments.service';

export type PlanKey = 'pro_monthly' | 'pro_yearly' | 'org_lite' | 'org_pro';

interface SubscribeResp {
  data: { subscriptionId: string; keyId: string };
}

export const membershipService = {
  getMine() {
    return apiFetch<{ data: { status: string; isActive: boolean; currentPeriodEnd: string | null } }>(
      '/membership'
    );
  },
  subscribe(plan: PlanKey) {
    return apiFetch<SubscribeResp>('/membership/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  },
  verify(input: { razorpayPaymentId: string; razorpaySubscriptionId: string; razorpaySignature: string }) {
    return apiFetch<{ data: { ok: boolean } }>('/membership/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  cancel() {
    return apiFetch<{ data: unknown }>('/membership/cancel', { method: 'POST' });
  },
};

interface RzpSubResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/**
 * Full upgrade flow: create subscription → Razorpay checkout → verify.
 * Resolves true on success, false if the user dismisses the modal.
 */
export async function startSubscription(
  plan: PlanKey,
  prefill?: { name?: string; email?: string }
): Promise<boolean> {
  const { data } = await membershipService.subscribe(plan);
  if (!(await loadRazorpayScript())) throw new Error('Could not load the payment window');

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp = new (window as any).Razorpay({
      key: data.keyId,
      subscription_id: data.subscriptionId,
      name: 'TapByWisein',
      description: 'Plan subscription',
      prefill,
      theme: { color: '#3B6FF0' },
      handler: (resp: RzpSubResponse) => {
        membershipService
          .verify({
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySubscriptionId: resp.razorpay_subscription_id,
            razorpaySignature: resp.razorpay_signature,
          })
          .then(() => resolve(true))
          .catch(reject);
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rzp.open();
  });
}
