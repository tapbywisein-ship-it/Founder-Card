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

/** Plan catalogue. Amounts are in INR; Razorpay wants paise. Period/interval
 *  map straight onto the Razorpay Plans API. Free-tier limits live here too so
 *  the whole membership "contract" is one object. */
export type PlanKey = 'monthly' | 'annual';

export const PLANS: Record<
  PlanKey,
  { label: string; amountInr: number; period: 'monthly' | 'yearly'; interval: number }
> = {
  monthly: { label: 'Founder Monthly', amountInr: 299, period: 'monthly', interval: 1 },
  annual: { label: 'Founder Annual', amountInr: 2990, period: 'yearly', interval: 1 },
};

/** Free-tier ceiling on active follow-up reminders. Members are uncapped. */
export const FREE_FOLLOWUP_LIMIT = 3;

const PLAN_SETTING_KEY = (plan: PlanKey) => `razorpay.plan.${plan}`;

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
      plans: Object.entries(PLANS).map(([key, p]) => ({
        key,
        label: p.label,
        amountInr: p.amountInr,
        period: p.period,
      })),
      perks: [
        'Unlimited follow-up reminders',
        'Network search across your connections',
        'Full profile-view analytics',
      ],
    };
  }

  /** Lazily create (and cache) a Razorpay Plan for the given tier so the app
   *  works without manual dashboard setup. The plan id is cached in
   *  PlatformSetting and reused thereafter. */
  private async ensurePlanId(plan: PlanKey): Promise<string> {
    const key = PLAN_SETTING_KEY(plan);
    const cached = await prisma.platformSetting.findUnique({ where: { key } }).catch(() => null);
    if (cached?.value) return cached.value;

    const spec = PLANS[plan];
    const res = await fetch(`${RAZORPAY_API}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        period: spec.period,
        interval: spec.interval,
        item: {
          name: spec.label,
          amount: Math.round(spec.amountInr * 100),
          currency: 'INR',
          description: 'TapByWisein Founder membership',
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error('Razorpay plan create failed', { plan, body });
      throw new ServiceUnavailableError('Could not set up the membership plan');
    }
    const created = (await res.json()) as { id: string };
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: created.id },
      create: { key, value: created.id, type: 'string', label: `Razorpay plan id (${plan})` },
    });
    return created.id;
  }

  /**
   * Create a Razorpay subscription for the user and persist a NONE-status
   * Membership row holding the subscription id. Returns the data Checkout needs.
   * Activation happens on verify (or webhook).
   */
  async createSubscription(userId: string, plan: PlanKey) {
    if (!configured()) throw new ServiceUnavailableError('Payments are not configured');
    if (!PLANS[plan]) throw new BadRequestError('Invalid plan');

    if (await this.isActiveMember(userId)) {
      throw new BadRequestError('You already have an active membership');
    }

    const planId = await this.ensurePlanId(plan);

    // total_count caps billing cycles; 120 monthly ≈ 10y, 10 yearly = 10y.
    const totalCount = plan === 'monthly' ? 120 : 10;

    const res = await fetch(`${RAZORPAY_API}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        plan_id: planId,
        total_count: totalCount,
        customer_notify: 1,
        notes: { userId },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error('Razorpay subscription create failed', { userId, body });
      throw new ServiceUnavailableError('Could not start the subscription');
    }
    const sub = (await res.json()) as RazorpaySubscription;

    await prisma.membership.upsert({
      where: { userId },
      update: {
        plan,
        razorpaySubscriptionId: sub.id,
        razorpayPlanId: planId,
        status: 'NONE',
        cancelAtPeriodEnd: false,
      },
      create: {
        userId,
        plan,
        razorpaySubscriptionId: sub.id,
        razorpayPlanId: planId,
        status: 'NONE',
      },
    });

    return {
      subscriptionId: sub.id,
      keyId: env.RAZORPAY_KEY_ID,
      plan,
      amountInr: PLANS[plan].amountInr,
    };
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
