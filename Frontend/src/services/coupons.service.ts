import { apiFetch } from './api';

export interface Coupon {
  id: string;
  eventId: string;
  code: string;
  discountPct: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponPayload {
  code: string;
  discountPct: number;
  maxUses?: number;
  expiresAt?: string;
}

export const couponsService = {
  async list(eventId: string) {
    return apiFetch<{ data: Coupon[] }>(`/organizer/events/${eventId}/coupons`);
  },
  async create(eventId: string, payload: CreateCouponPayload) {
    return apiFetch<{ data: Coupon }>(`/organizer/events/${eventId}/coupons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async remove(eventId: string, couponId: string) {
    return apiFetch<{ data: null }>(`/organizer/events/${eventId}/coupons/${couponId}`, {
      method: 'DELETE',
    });
  },
  /** Public — validate a code at checkout. */
  async validate(eventId: string, code: string) {
    return apiFetch<{ data: { discountPct: number; code: string } }>(
      `/events/${eventId}/coupons/${encodeURIComponent(code)}/validate`
    );
  },
};
