import crypto from 'crypto';
import prisma from '@config/database';
import { env } from '@config/env';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '@utils/errors';
import logger from '@utils/logger';
import notificationsService from '@modules/notifications/notifications.service';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

const authHeader = (): string =>
  `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

const configured = (): boolean => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/** Legacy plan identifiers — kept so old Membership rows and the verify/cancel
 *  flows for any pre-existing subscriber still type-check. No longer sold. */
export type PlanKey = 'monthly' | 'annual';

const timingSafe = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

interface RazorpaySubscription {
  id: string;
  status: string;
  current_end?: number | null;
  plan_id: string;
}

export class MembershipService {
  isConfigured(): boolean {
    return configured();
  }

  /** True when the user is entitled to member perks right now. A CANCELLED
   *  member keeps access until currentPeriodEnd. */
  async isActiveMember(userId: string): Promise<boolean> {
    const m = await prisma.membership.findUnique({ where: { userId } });
    if (!m) return false;
    if (m.status === 'ACTIVE') return true;
    if (
      m.status === 'CANCELLED' &&
      m.currentPeriodEnd &&
      m.currentPeriodEnd.getTime() > Date.now()
    ) {
      return true;
    }
    return false;
  }

  /** Membership summary for the account page. */
  async getMyMembership(userId: string) {
    const m = await prisma.membership.findUnique({ where: { userId } });
    const isActive = await this.isActiveMember(userId);
    return {
      status: m?.status ?? 'NONE',
      plan: m?.plan ?? null,
      isActive,
      currentPeriodEnd: m?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: m?.cancelAtPeriodEnd ?? false,
      // No paid plans on offer anymore — these perks are free for everyone.
      perks: [
        'Unlimited follow-up reminders',
        'Network search across your connections',
        'Full profile-view analytics',
      ],
    };
  }

  /**
   * Founder membership perks (unlimited follow-ups, network search) are free
   * for everyone now — new paid subscriptions are no longer offered.
   */
  async createSubscription(_userId: string, _plan: PlanKey): Promise<never> {
    throw new BadRequestError('Founder membership is no longer a paid subscription — all perks are free.');
  }

  /**
   * Verify the subscription authorization signature from Checkout and activate.
   * Signature = HMAC_SHA256(payment_id + '|' + subscription_id, key_secret).
   */
  async verifySubscription(
    userId: string,
    input: { razorpayPaymentId: string; razorpaySubscriptionId: string; razorpaySignature: string }
  ) {
    if (!configured()) throw new ServiceUnavailableError('Payments are not configured');
    const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = input;

    const membership = await prisma.membership.findUnique({ where: { userId } });
    if (!membership || membership.razorpaySubscriptionId !== razorpaySubscriptionId) {
      throw new NotFoundError('Subscription');
    }

    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest('hex');

    if (!timingSafe(expected, razorpaySignature)) {
      throw new BadRequestError('Subscription verification failed');
    }

    // Pull the live subscription so currentPeriodEnd reflects Razorpay's truth.
    const periodEnd = await this.fetchPeriodEnd(razorpaySubscriptionId);

    await prisma.membership.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: periodEnd,
      },
    });

    await notificationsService
      .createNotification(
        userId,
        'SYSTEM',
        'Welcome to Founder membership 🎉',
        'Your membership is active. Enjoy unlimited follow-ups, network search, and full analytics.'
      )
      .catch(() => {});

    return { ok: true };
  }

  private async fetchPeriodEnd(subscriptionId: string): Promise<Date | null> {
    try {
      const res = await fetch(`${RAZORPAY_API}/subscriptions/${subscriptionId}`, {
        headers: { Authorization: authHeader() },
      });
      if (!res.ok) return null;
      const sub = (await res.json()) as RazorpaySubscription;
      return sub.current_end ? new Date(sub.current_end * 1000) : null;
    } catch {
      return null;
    }
  }

  /** Cancel at period end — the member keeps access until currentPeriodEnd. */
  async cancelSubscription(userId: string) {
    if (!configured()) throw new ServiceUnavailableError('Payments are not configured');
    const membership = await prisma.membership.findUnique({ where: { userId } });
    if (!membership?.razorpaySubscriptionId) throw new NotFoundError('Subscription');
    if (membership.status !== 'ACTIVE') {
      throw new BadRequestError('No active membership to cancel');
    }

    const res = await fetch(
      `${RAZORPAY_API}/subscriptions/${membership.razorpaySubscriptionId}/cancel`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({ cancel_at_cycle_end: 1 }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      logger.error('Razorpay subscription cancel failed', { userId, body });
      throw new ServiceUnavailableError('Could not cancel the subscription');
    }

    await prisma.membership.update({
      where: { userId },
      data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
    });

    return { ok: true, accessUntil: membership.currentPeriodEnd };
  }

  /**
   * Webhook safety net for subscription lifecycle. Idempotent — keyed on the
   * subscription id, applies the terminal state Razorpay reports.
   */
  async handleSubscriptionEvent(
    eventType: string,
    subscription: Record<string, unknown>
  ): Promise<void> {
    const subId = subscription.id as string | undefined;
    if (!subId) return;

    const membership = await prisma.membership.findUnique({
      where: { razorpaySubscriptionId: subId },
    });
    if (!membership) return;

    const currentEnd = subscription.current_end as number | undefined;
    const periodEnd = currentEnd ? new Date(currentEnd * 1000) : membership.currentPeriodEnd;

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged':
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: periodEnd },
        });
        break;
      case 'subscription.halted':
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'HALTED' },
        });
        await notificationsService
          .createNotification(
            membership.userId,
            'SYSTEM',
            'Membership payment failed',
            "We couldn't charge your membership. Update your payment method to keep your perks."
          )
          .catch(() => {});
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'EXPIRED', cancelAtPeriodEnd: false },
        });
        break;
      default:
        break;
    }
  }
}

export default new MembershipService();
