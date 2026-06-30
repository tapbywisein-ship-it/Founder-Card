import { apiFetch } from './api';
import { supabase } from '@/lib/supabase';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

export async function openInvoice(registrationId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
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
  amount: number;
  currency: string;
  keyId: string;
  eventTitle: string;
  ticketTierName: string;
}

export interface VerifyResult {
  payment: { id: string; status: string };
  registration: { id: string } | null;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CardOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export const paymentsService = {
  async getConfig() {
    return apiFetch<{ data: { configured: boolean; cardPrice: number } }>('/payments/config');
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

  /** Create a Razorpay order for the one-time NFC Tap Card purchase. */
  async createCardOrder(shippingAddress: ShippingAddress) {
    return apiFetch<{ data: CardOrder }>('/payments/card/order', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress }),
    });
  },

  /** Verify the card purchase signature and activate the Tap Card. */
  async verifyCard(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    return apiFetch<{ data: { ok: boolean } }>('/payments/card/verify', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

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

export function openRazorpayCheckout(opts: RazorpayOptions): void {
  const RazorpayCtor = (window as unknown as { Razorpay: new (o: RazorpayOptions) => { open: () => void } })
    .Razorpay;
  const rzp = new RazorpayCtor(opts);
  rzp.open();
}
