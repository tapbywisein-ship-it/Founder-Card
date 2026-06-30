import { apiFetch } from './api';
import { loadRazorpayScript } from './payments.service';

export type PlanKey = 'monthly' | 'annual';

export interface MembershipPlan {
  key: PlanKey;
  label: string;
  amountInr: number;
  period: 'monthly' | 'yearly';
}

export interface Membership {
  status: 'NONE' | 'ACTIVE' | 'CANCELLED' | 'HALTED' | 'EXPIRED';
  plan: PlanKey | null;
  isActive: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plans: MembershipPlan[];
  perks: string[];
}

interface SubscriptionInit {
  subscriptionId: string;
  keyId: string;
  plan: PlanKey;
  amountInr: number;
}

interface RazorpaySubscriptionResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export const membershipService = {
  async getMine() {
    return apiFetch<{ data: Membership }>('/membership');
  },

  async subscribe(plan: PlanKey) {
    return apiFetch<{ data: SubscriptionInit }>('/membership/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  },

  async verify(input: {
    razorpayPaymentId: string;
    razorpaySubscriptionId: string;
    razorpaySignature: string;
  }) {
    return apiFetch<{ data: { ok: boolean } }>('/membership/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async cancel() {
    return apiFetch<{ data: { ok: boolean; accessUntil: string | null } }>('/membership/cancel', {
      method: 'POST',
    });
  },
};

/** Opens Razorpay Checkout in subscription mode (subscription_id instead of
 *  order_id) and resolves once the membership is verified server-side. */
export async function openSubscriptionCheckout(
  init: SubscriptionInit,
  prefill: { name?: string; email?: string }
): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error('Could not load the payment window. Check your connection.');

  await new Promise<void>((resolve, reject) => {
    const RazorpayCtor = (window as unknown as {
      Razorpay: new (o: Record<string, unknown>) => { open: () => void };
    }).Razorpay;

    const rzp = new RazorpayCtor({
      key: init.keyId,
      subscription_id: init.subscriptionId,
      name: 'TapByWisein',
      description: 'Founder membership',
      prefill: { name: prefill.name, email: prefill.email },
      theme: { color: '#3B6FF0' },
      handler: (resp: RazorpaySubscriptionResponse) => {
        membershipService
          .verify({
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySubscriptionId: resp.razorpay_subscription_id,
            razorpaySignature: resp.razorpay_signature,
          })
          .then(() => resolve())
          .catch(reject);
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}
