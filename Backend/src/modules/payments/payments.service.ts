import crypto from 'crypto';
import prisma from '@config/database';
import { env } from '@config/env';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
} from '@utils/errors';
import logger from '@utils/logger';
import { findTier } from '@utils/ticketPricing';
import { sendEmail, refundConfirmationEmail } from '@utils/email';

const RAZORPAY_API = 'https://api.razorpay.com/v1';
const DEFAULT_FEE_PERCENT = 5;

/** True when Razorpay keys are present. Other modules use this to decide whether
 *  paid events should be gated behind checkout. */
export const paymentsConfigured = (): boolean =>
  Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/** Platform fee % from PlatformSetting `platform.feePercent` (default 5). */
export async function getPlatformFeePercent(): Promise<number> {
  const row = await prisma.platformSetting
    .findUnique({ where: { key: 'platform.feePercent' } })
    .catch(() => null);
  const n = row ? Number(row.value) : DEFAULT_FEE_PERCENT;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_FEE_PERCENT;
}

const authHeader = (): string =>
  `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

const timingSafe = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

export class PaymentsService {
  isConfigured(): boolean {
    return paymentsConfigured();
  }

  /**
   * Create a Razorpay order for one paid ticket tier and persist a CREATED
   * Payment row. Returns the data the frontend Checkout widget needs.
   */
  async createOrder(userId: string, eventId: string, ticketTierId: string) {
    if (!paymentsConfigured()) {
      throw new ServiceUnavailableError('Payments are not configured');
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!event) throw new NotFoundError('Event');

    const tier = findTier(event, ticketTierId);
    if (!tier) throw new BadRequestError('Invalid ticket tier');
    if (tier.price <= 0) {
      throw new BadRequestError('This ticket is free — register without payment');
    }

    // Per-tier capacity: reject if this tier is sold out.
    if (tier.count && tier.count > 0) {
      const sold = await prisma.eventRegistration.count({
        where: { eventId, ticketTierId, status: { not: 'CANCELLED' } },
      });
      if (sold >= tier.count) throw new BadRequestError('This ticket tier is sold out');
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing && existing.status !== 'CANCELLED' && existing.paymentStatus === 'PAID') {
      throw new ConflictError('You already have a paid ticket for this event');
    }

    const amountPaise = Math.round(tier.price * 100);
    let order: { id: string; amount: number; currency: string };
    try {
      const res = await fetch(`${RAZORPAY_API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `evt_${eventId.slice(0, 8)}_${userId.slice(0, 8)}_${Date.now()}`,
          notes: { eventId, userId, ticketTierId, ticketTierName: tier.name },
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error('Razorpay order create failed', { status: res.status, text });
        throw new BadRequestError('Could not initiate payment. Please try again.');
      }
      order = (await res.json()) as { id: string; amount: number; currency: string };
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      logger.error('Razorpay order create error', { err });
      throw new ServiceUnavailableError('Payment provider is unavailable. Please try again.');
    }

    await prisma.payment.create({
      data: {
        userId,
        eventId,
        razorpayOrderId: order.id,
        amount: tier.price,
        currency: 'INR',
        ticketTierId,
        ticketTierName: tier.name,
        status: 'CREATED',
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      eventTitle: event.title,
      ticketTierName: tier.name,
    };
  }

  /**
   * Verify the Razorpay checkout signature and, on success, finalize the
   * registration (REGISTERED + paid). Idempotent for an already-PAID order.
   */
  async verifyAndConfirm(
    userId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  ) {
    if (!paymentsConfigured()) {
      throw new ServiceUnavailableError('Payments are not configured');
    }
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment) throw new NotFoundError('Payment');
    if (payment.userId !== userId) {
      throw new ForbiddenError('This payment does not belong to you');
    }

    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!timingSafe(expected, razorpaySignature)) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', razorpayPaymentId, razorpaySignature },
      });
      throw new BadRequestError('Payment verification failed');
    }

    // Idempotent: a re-submitted verify for an already-confirmed order is a no-op.
    if (payment.status === 'PAID' && payment.registrationId) {
      const registration = await prisma.eventRegistration.findUnique({
        where: { id: payment.registrationId },
      });
      return { payment, registration };
    }

    const eventsService = (await import('@modules/events/events.service')).default;
    const registration = await eventsService.finalizePaidRegistration({
      eventId: payment.eventId,
      userId,
      amountPaid: Number(payment.amount),
      ticketTierId: payment.ticketTierId ?? undefined,
      ticketTierName: payment.ticketTierName ?? undefined,
    });

    // Revenue ledger: split the captured amount into platform fee + organizer earning.
    const feePercent = await getPlatformFeePercent();
    const amount = Number(payment.amount);
    const platformFee = Math.round(amount * feePercent) / 100;
    const organizerEarning = Math.round((amount - platformFee) * 100) / 100;

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        razorpayPaymentId,
        razorpaySignature,
        registrationId: registration.id,
        platformFee,
        organizerEarning,
      },
    });

    return { payment: updated, registration };
  }

  /**
   * Best-effort refund of the latest PAID payment for a registration. On success
   * marks the Payment + registration REFUNDED and emails the attendee. Returns
   * false (no-op) when payments aren't configured or there's nothing to refund.
   */
  async refundForRegistration(registrationId: string): Promise<boolean> {
    if (!paymentsConfigured()) return false;
    const payment = await prisma.payment.findFirst({
      where: { registrationId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment || !payment.razorpayPaymentId) return false;

    try {
      const res = await fetch(`${RAZORPAY_API}/payments/${payment.razorpayPaymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({ amount: Math.round(Number(payment.amount) * 100) }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error('Razorpay refund failed', { status: res.status, text, paymentId: payment.id });
        return false;
      }
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
      await prisma.eventRegistration
        .update({ where: { id: registrationId }, data: { paymentStatus: 'REFUNDED' } })
        .catch(() => {});

      // Email the attendee a refund confirmation (best-effort).
      this.sendRefundEmail(payment.userId, payment.eventId, Number(payment.amount)).catch(() => {});
      return true;
    } catch (err) {
      logger.error('Razorpay refund error', { err, paymentId: payment.id });
      return false;
    }
  }

  private async sendRefundEmail(userId: string, eventId: string, amount: number): Promise<void> {
    const [user, event] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profile: { select: { firstName: true } } },
      }),
      prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
    ]);
    if (!user?.email) return;
    const name = user.profile?.firstName ?? 'there';
    await sendEmail(
      user.email,
      'Refund processed — Founder Key',
      refundConfirmationEmail(name, event?.title ?? 'your event', `₹${amount.toLocaleString('en-IN')}`)
    );
  }

  /**
   * Generate a printable HTML invoice for a paid registration. Visible to the
   * attendee who paid, the event organizer, or an admin.
   */
  async getInvoiceHtml(registrationId: string, caller: { userId: string; role: string }): Promise<string> {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: { select: { id: true, title: true, organizerId: true, startDate: true } },
        user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!reg) throw new NotFoundError('Registration');

    const isAdmin = caller.role === 'ADMIN';
    const isOwner = reg.userId === caller.userId;
    const isOrganizer = reg.event.organizerId === caller.userId;
    if (!isAdmin && !isOwner && !isOrganizer) {
      throw new ForbiddenError('You cannot view this invoice');
    }

    const payment = await prisma.payment.findFirst({
      where: { registrationId, status: { in: ['PAID', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw new NotFoundError('Invoice');

    const buyer = reg.user.profile
      ? `${reg.user.profile.firstName} ${reg.user.profile.lastName}`.trim()
      : reg.user.email;
    const amount = Number(payment.amount);
    const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const issued = new Date(payment.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' });
    const invoiceNo = `FK-INV-${payment.id.slice(0, 8).toUpperCase()}`;
    const status = payment.status === 'REFUNDED' ? 'REFUNDED' : 'PAID';

    return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1e293b;max-width:720px;margin:32px auto;padding:0 24px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #6366f1;padding-bottom:16px}
  .brand{font-size:22px;font-weight:700;color:#6366f1}
  .muted{color:#64748b;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:24px}
  th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px}
  th{color:#64748b;font-weight:600}
  .right{text-align:right}
  .total{font-size:18px;font-weight:700}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#dcfce7;color:#166534}
  .badge.r{background:#fee2e2;color:#991b1b}
  @media print{.noprint{display:none}}
</style></head><body>
  <div class="head">
    <div><div class="brand">⚡ FounderKey</div><div class="muted">Invoice</div></div>
    <div class="right"><div><strong>${invoiceNo}</strong></div><div class="muted">${issued}</div>
      <div style="margin-top:6px"><span class="badge ${status === 'REFUNDED' ? 'r' : ''}">${status}</span></div></div>
  </div>
  <p style="margin-top:20px"><strong>Billed to:</strong> ${buyer}<br/><span class="muted">${reg.user.email}</span></p>
  <table>
    <tr><th>Description</th><th class="right">Amount</th></tr>
    <tr><td>${reg.event.title}${payment.ticketTierName ? ` — ${payment.ticketTierName}` : ''}</td><td class="right">${inr(amount)}</td></tr>
    <tr><td class="total">Total ${status === 'REFUNDED' ? '(refunded)' : 'paid'}</td><td class="right total">${inr(amount)}</td></tr>
  </table>
  <p class="muted" style="margin-top:24px">Payment ref: ${payment.razorpayPaymentId ?? payment.razorpayOrderId}</p>
  <button class="noprint" onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer">Print / Save as PDF</button>
</body></html>`;
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return timingSafe(expected, signature);
  }

  /**
   * Webhook safety net: if Checkout's verify call never reaches us (closed tab,
   * dropped connection) Razorpay still notifies us of payment.captured, so we
   * finalize here too. Idempotent against the verify path.
   */
  async handleWebhookEvent(payload: Record<string, unknown>): Promise<void> {
    try {
      const eventType = payload.event as string | undefined;
      if (eventType !== 'payment.captured' && eventType !== 'order.paid') return;

      const entity =
        (payload as { payload?: { payment?: { entity?: Record<string, unknown> } } }).payload?.payment
          ?.entity ?? {};
      const orderId = entity.order_id as string | undefined;
      const paymentId = entity.id as string | undefined;
      if (!orderId || !paymentId) return;

      const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
      if (!payment || payment.status === 'PAID') return;

      // Atomically claim the CREATED -> PAID transition. If a concurrent
      // verify request beat us to it (or a duplicate webhook fires), updateMany
      // returns 0 and we exit without re-running finalization.
      const claim = await prisma.payment.updateMany({
        where: { id: payment.id, status: 'CREATED' },
        data: { status: 'PAID', razorpayPaymentId: paymentId },
      });
      if (claim.count === 0) return;

      const eventsService = (await import('@modules/events/events.service')).default;
      const registration = await eventsService.finalizePaidRegistration({
        eventId: payment.eventId,
        userId: payment.userId,
        amountPaid: Number(payment.amount),
        ticketTierId: payment.ticketTierId ?? undefined,
        ticketTierName: payment.ticketTierName ?? undefined,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { registrationId: registration.id },
      });
    } catch (err) {
      logger.error('Razorpay webhook processing error', { err });
    }
  }
}

export default new PaymentsService();
