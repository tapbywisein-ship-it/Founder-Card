import crypto from 'crypto';
import { UserTier } from '@prisma/client';
import prisma from '@config/database';
import { env } from '@config/env';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '@utils/errors';
import logger from '@utils/logger';
import notificationsService from '@modules/notifications/notifications.service';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

const authHeader = (): string =>
  `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

const configured = (): boolean => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export type PlanKey = 'pro_monthly' | 'pro_yearly' | 'org_lite' | 'org_pro';

/** Public plan key → Razorpay plan id (server-only) + granted tier. */
const PLANS: Record<PlanKey, { planId: () => string; tier: UserTier }> = {
  pro_monthly: { planId: () => env.RZP_PLAN_PRO_MONTHLY, tier: 'PRO' },
  pro_yearly: { planId: () => env.RZP_PLAN_PRO_YEARLY, tier: 'PRO' },
  org_lite: { planId: () => env.RZP_PLAN_ORG_LITE, tier: 'ORGANIZER_LITE' },
  org_pro: { planId: () => env.RZP_PLAN_ORG_PRO, tier: 'ORGANIZER_PRO' },
};

/** Razorpay plan_id → tier, for verify/webhook which only know the plan id. */
const planTierMap = (): Record<string, UserTier> => {
  const m: Record<string, UserTier> = {};
  for (const { planId, tier } of Object.values(PLANS)) {
    const id = planId();
    if (id) m[id] = tier;
  }
  return m;
};

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

  /** The paid tier a plan id grants, or null if it isn't one of ours. */
  tierForPlan(planId: string | null | undefined): UserTier | null {
    return planId ? (planTierMap()[planId] ?? null) : null;
  }

  /** Set the user's tier. Reset to FREE never downgrades a manually-set ENTERPRISE. */
  private async applyTier(userId: string, tier: UserTier): Promise<void> {
    if (tier === 'FREE') {
      await prisma.user.updateMany({
        where: { id: userId, tier: { notIn: ['ENTERPRISE'] } },
        data: { tier: 'FREE' },
      });
      return;
    }
    await prisma.user.update({ where: { id: userId }, data: { tier } });
  }

  /**
   * Create a Razorpay subscription for one of our plans and stash it on the
   * user's Membership row. Checkout authorizes it client-side; `verify` +
   * the webhook flip status to ACTIVE and grant the tier.
   */
  async createSubscription(userId: string, planKey: PlanKey) {
    if (!configured()) throw new ServiceUnavailableError('Payments are not configured');
    const plan = PLANS[planKey];
    const planId = plan?.planId();
    if (!planId) throw new BadRequestError('That plan is not available');

    const res = await fetch(`${RAZORPAY_API}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
      // ponytail: 120 cycles ≈ 10y monthly / 120y yearly — Razorpay needs a
      // finite count; bump if anyone actually renews for a decade.
      // notes.app tags this as ours on the Razorpay account shared with WiseIn.
      body: JSON.stringify({
        plan_id: planId,
        total_count: 120,
        customer_notify: 1,
        notes: { app: 'tapbywisein', tier: PLANS[planKey].tier },
      }),
    });
    if (!res.ok) {
      logger.error('Razorpay subscription create failed', {
        userId,
        planId,
        body: await res.text(),
      });
      throw new ServiceUnavailableError('Could not start the subscription');
    }
    const sub = (await res.json()) as RazorpaySubscription;

    await prisma.membership.upsert({
      where: { userId },
      create: {
        userId,
        status: 'NONE',
        plan: planId,
        razorpaySubscriptionId: sub.id,
        razorpayPlanId: planId,
      },
      update: { plan: planId, razorpaySubscriptionId: sub.id, razorpayPlanId: planId },
    });

    return { subscriptionId: sub.id, keyId: env.RAZORPAY_KEY_ID };
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

    const tier = this.tierForPlan(membership.razorpayPlanId);
    if (tier) await this.applyTier(userId, tier);

    await notificationsService
      .createNotification(
        userId,
        'SYSTEM',
        'Your plan is active 🎉',
        'Your subscription is active. Enjoy your upgraded features.'
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
      case 'subscription.charged': {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: 'ACTIVE', cancelAtPeriodEnd: false, currentPeriodEnd: periodEnd },
        });
        const tier = this.tierForPlan(membership.razorpayPlanId);
        if (tier) await this.applyTier(membership.userId, tier);
        break;
      }
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
        // Access ends now — drop back to Free.
        await this.applyTier(membership.userId, 'FREE');
        break;
      default:
        break;
    }
  }
}

export default new MembershipService();
