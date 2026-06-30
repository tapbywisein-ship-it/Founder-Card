import prisma from '@config/database';
import { NotFoundError, BadRequestError } from '@utils/errors';

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Revenue-ledger payouts (no Razorpay Route). Organizer earnings are the sum of
 * `Payment.organizerEarning` for PAID payments on their events; settled amounts
 * are recorded as `Payout` rows (status PAID) created by an admin. Pending =
 * earnings − settled.
 */
export class PayoutsService {
  async getOrganizerSummary(organizerId: string) {
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID', event: { organizerId } },
      select: {
        eventId: true,
        amount: true,
        platformFee: true,
        organizerEarning: true,
        event: { select: { title: true } },
      },
    });

    const byEvent = new Map<
      string,
      { eventId: string; title: string; gross: number; fee: number; earning: number; sales: number }
    >();
    let grossTotal = 0;
    let feeTotal = 0;
    let earningTotal = 0;
    for (const p of payments) {
      const gross = num(p.amount);
      const fee = num(p.platformFee);
      const earning = num(p.organizerEarning);
      grossTotal += gross;
      feeTotal += fee;
      earningTotal += earning;
      const e = byEvent.get(p.eventId) ?? {
        eventId: p.eventId,
        title: p.event.title,
        gross: 0,
        fee: 0,
        earning: 0,
        sales: 0,
      };
      e.gross += gross;
      e.fee += fee;
      e.earning += earning;
      e.sales += 1;
      byEvent.set(p.eventId, e);
    }

    const settledAgg = await prisma.payout.aggregate({
      where: { organizerId, status: 'PAID' },
      _sum: { amount: true },
    });
    const settled = num(settledAgg._sum.amount);
    const pending = Math.max(0, round(earningTotal - settled));

    return {
      totalGross: round(grossTotal),
      platformFee: round(feeTotal),
      totalEarnings: round(earningTotal),
      settled: round(settled),
      pending,
      events: [...byEvent.values()].map((e) => ({
        eventId: e.eventId,
        title: e.title,
        sales: e.sales,
        gross: round(e.gross),
        fee: round(e.fee),
        earning: round(e.earning),
      })),
    };
  }

  async listAdminPayouts() {
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID' },
      select: { organizerEarning: true, event: { select: { organizerId: true } } },
    });
    const earnedByOrg = new Map<string, number>();
    for (const p of payments) {
      const org = p.event.organizerId;
      earnedByOrg.set(org, (earnedByOrg.get(org) ?? 0) + num(p.organizerEarning));
    }

    const settlements = await prisma.payout.groupBy({
      by: ['organizerId'],
      where: { status: 'PAID' },
      _sum: { amount: true },
    });
    const settledByOrg = new Map(settlements.map((s) => [s.organizerId, num(s._sum.amount)]));

    const orgIds = [...earnedByOrg.keys()];
    const orgs = orgIds.length
      ? await prisma.user.findMany({
          where: { id: { in: orgIds } },
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                payoutUpiId: true,
                payoutAccountName: true,
                payoutBankName: true,
                payoutAccountNumber: true,
                payoutIfsc: true,
              },
            },
          },
        })
      : [];

    const organizers = orgs.map((o) => {
      const earned = earnedByOrg.get(o.id) ?? 0;
      const settled = settledByOrg.get(o.id) ?? 0;
      return {
        organizerId: o.id,
        email: o.email,
        name: o.profile ? `${o.profile.firstName} ${o.profile.lastName}`.trim() : o.email,
        earned: round(earned),
        settled: round(settled),
        pending: Math.max(0, round(earned - settled)),
        payoutAccount: o.profile
          ? {
              upiId: o.profile.payoutUpiId,
              accountName: o.profile.payoutAccountName,
              bankName: o.profile.payoutBankName,
              accountNumber: o.profile.payoutAccountNumber,
              ifsc: o.profile.payoutIfsc,
            }
          : null,
      };
    });

    const recentPayouts = await prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        organizer: {
          select: { email: true, profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return { organizers, recentPayouts };
  }

  async settle(organizerId: string, amount: number, reference?: string, note?: string) {
    const org = await prisma.user.findUnique({ where: { id: organizerId }, select: { id: true } });
    if (!org) throw new NotFoundError('Organizer');
    if (!(amount > 0)) throw new BadRequestError('Settlement amount must be positive');
    return prisma.payout.create({
      data: {
        organizerId,
        amount,
        status: 'PAID',
        reference: reference ?? null,
        note: note ?? null,
        paidAt: new Date(),
      },
    });
  }
}

export default new PayoutsService();
