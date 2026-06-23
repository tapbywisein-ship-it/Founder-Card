import { apiFetch, getAccessToken } from './api';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

/** Fetch the HTML invoice (auth-gated) and open it in a new tab for print/save. */
export async function openInvoice(registrationId: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/payments/${encodeURIComponent(registrationId)}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Could not load invoice');
  const html = await res.text();
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}

export interface PaymentOrder {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  eventTitle: string;
  ticketTierName: string;
}

export interface VerifyResult {
  payment: { id: string; status: string };
  registration: { id: string } | null;
}

export const paymentsService = {
  async getConfig() {
    return apiFetch<{ data: { configured: boolean } }>('/payments/config');
  },

  async createOrder(eventId: string, ticketTierId: string) {
    return apiFetch<{ data: PaymentOrder }>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ eventId, ticketTierId }),
    });
  },

  async verify(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return apiFetch<{ data: VerifyResult }>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

/** Lazy-load the Razorpay Checkout script once. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (resp: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}

/** Open the Razorpay Checkout widget for an order. */
export function openRazorpayCheckout(opts: RazorpayOptions): void {
  const RazorpayCtor = (window as unknown as { Razorpay: new (o: RazorpayOptions) => { open: () => void } })
    .Razorpay;
  const rzp = new RazorpayCtor(opts);
  rzp.open();
}
