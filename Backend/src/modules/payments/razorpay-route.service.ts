import prisma from '@config/database';
import { env } from '@config/env';
import { BadRequestError, NotFoundError, ServiceUnavailableError } from '@utils/errors';
import logger from '@utils/logger';

const RAZORPAY_API_V1 = 'https://api.razorpay.com/v1';
const RAZORPAY_API_V2 = 'https://api.razorpay.com/v2';

const authHeader = (): string =>
  `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;

export interface OnboardingInput {
  legalBusinessName: string;
  pan: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  // Bank account
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
}

export class RazorpayRouteService {
  /**
   * Creates a Razorpay Route linked account for the organizer, stores the
   * account ID + status on their profile, then immediately adds their bank
   * account to the linked account.
   */
  async onboardOrganizer(
    userId: string,
    input: OnboardingInput
  ): Promise<{ accountId: string; status: string }> {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
      throw new ServiceUnavailableError('Payments are not configured');
    }

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Profile');

    // Idempotent: if already onboarded, just return current status.
    if (profile.razorpayAccountId) {
      return {
        accountId: profile.razorpayAccountId,
        status: profile.razorpayAccountStatus ?? 'created',
      };
    }

    // Step 1 — Create the Route linked account
    let accountId: string;
    try {
      const res = await fetch(`${RAZORPAY_API_V2}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({
          email: input.contactEmail,
          profile: {
            category: 'tours_and_travel',
            subcategory: 'events_and_ticketing',
            addresses: {
              registered: {
                street1: input.street,
                city: input.city,
                state: input.state,
                postal_code: input.postalCode,
                country: 'IN',
              },
            },
          },
          legal_business_name: input.legalBusinessName,
          business_type: 'route',
          legal_info: { pan: input.pan.toUpperCase() },
          contact_name: input.contactName,
          contact_info: {
            email: input.contactEmail,
            contact: input.contactPhone.replace(/\D/g, ''),
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error('Razorpay Route account creation failed', { status: res.status, text });
        let parsed: { error?: { description?: string } } = {};
        try { parsed = JSON.parse(text); } catch { /* ignore */ }
        const desc = parsed?.error?.description ?? '';
        const userMsg = desc.toLowerCase().includes('access denied')
          ? 'Razorpay Route is not enabled on this account. Please contact Razorpay support to activate Route.'
          : 'Could not create Route account. Check your details and try again.';
        throw new BadRequestError(userMsg);
      }

      const body = (await res.json()) as { id: string };
      accountId = body.id;
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      logger.error('Razorpay Route create account error', { err });
      throw new ServiceUnavailableError('Razorpay is unavailable. Please try again.');
    }

    // Step 2 — Add bank account to the linked account
    try {
      const res = await fetch(`${RAZORPAY_API_V2}/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify({
          bank_account: {
            ifsc_code: input.ifscCode.toUpperCase(),
            beneficiary_name: input.beneficiaryName,
            account_number: input.accountNumber,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.warn('Razorpay Route bank account add failed', {
          status: res.status,
          text,
          accountId,
        });
        // Don't throw — account is created, bank details can be retried
      }
    } catch (err) {
      logger.warn('Razorpay Route bank account error', { err, accountId });
    }

    // Persist account ID and initial status to profile
    await prisma.profile.update({
      where: { userId },
      data: { razorpayAccountId: accountId, razorpayAccountStatus: 'created' },
    });

    return { accountId, status: 'created' };
  }

  /**
   * Refreshes the linked account status from Razorpay and stores it.
   * Call this from a webhook or periodically.
   */
  async refreshAccountStatus(userId: string): Promise<string> {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile?.razorpayAccountId) throw new NotFoundError('Linked account');

    try {
      const res = await fetch(`${RAZORPAY_API_V2}/accounts/${profile.razorpayAccountId}`, {
        headers: { Authorization: authHeader() },
      });
      if (!res.ok) return profile.razorpayAccountStatus ?? 'created';

      const body = (await res.json()) as { status: string };
      const status = body.status ?? 'created';

      await prisma.profile.update({
        where: { userId },
        data: { razorpayAccountStatus: status },
      });

      return status;
    } catch (err) {
      logger.warn('Razorpay Route status refresh error', { err, userId });
      return profile.razorpayAccountStatus ?? 'created';
    }
  }

  /**
   * Transfers the organizer's share to their Razorpay Route linked account.
   * Called from paymentsService after a ticket payment is verified.
   * Amount must be in rupees (we convert to paise internally).
   */
  async transferToOrganizer(
    razorpayPaymentId: string,
    linkedAccountId: string,
    amountRupees: number,
    paymentDbId: string
  ): Promise<void> {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return;

    const amountPaise = Math.round(amountRupees * 100);
    if (amountPaise <= 0) return;

    try {
      const res = await fetch(`${RAZORPAY_API_V1}/payments/${razorpayPaymentId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
        body: JSON.stringify([
          {
            account: linkedAccountId,
            amount: amountPaise,
            currency: 'INR',
            on_hold: 0,
            notes: { source: 'tapbywisein_ticket_sale', paymentId: paymentDbId },
          },
        ]),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        logger.error('Razorpay Route transfer failed', {
          status: res.status,
          text,
          razorpayPaymentId,
        });
        await prisma.payment.update({
          where: { id: paymentDbId },
          data: { transferStatus: 'failed' },
        });
        return;
      }

      const body = (await res.json()) as { items?: Array<{ id: string; amount: number }> };
      const transfer = body.items?.[0];

      await prisma.payment.update({
        where: { id: paymentDbId },
        data: {
          transferId: transfer?.id ?? null,
          transferStatus: 'processed',
          transferAmount: amountRupees,
          transferredAt: new Date(),
        },
      });

      logger.info('Razorpay Route transfer successful', {
        paymentDbId,
        transferId: transfer?.id,
        amountRupees,
      });
    } catch (err) {
      logger.error('Razorpay Route transfer error', { err, razorpayPaymentId });
      await prisma.payment
        .update({
          where: { id: paymentDbId },
          data: { transferStatus: 'failed' },
        })
        .catch(() => {});
    }
  }

  /** Returns the organizer's linked account info from their profile. */
  async getLinkedAccount(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        razorpayAccountId: true,
        razorpayAccountStatus: true,
        payoutAccountName: true,
        payoutBankName: true,
        payoutAccountNumber: true,
        payoutIfsc: true,
      },
    });
    return profile;
  }
}

export default new RazorpayRouteService();
