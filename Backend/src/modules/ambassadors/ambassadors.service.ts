import prisma from '@config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { randomShortToken } from '@utils/slug';
import notificationsService from '@modules/notifications/notifications.service';
import {
  ApplyAmbassadorDto,
  UpdateAmbassadorStatusDto,
  SubmitShippingAddressDto,
} from './ambassadors.validation';

// Public-safe user fields for the directory (never expose email/private data).
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  profile: {
    select: { firstName: true, lastName: true, avatar: true, company: true, position: true },
  },
} as const;

export const AMBASSADOR_LEVELS = ['INSIDER', 'AMBASSADOR', 'LEADER', 'ELITE'] as const;
export type AmbassadorLevel = (typeof AMBASSADOR_LEVELS)[number];

// Booking-count thresholds for each level, highest first — reward is a
// physical item shipped manually once an ambassador crosses a threshold.
const LEVEL_THRESHOLDS: { level: AmbassadorLevel; min: number }[] = [
  { level: 'ELITE', min: 250 },
  { level: 'LEADER', min: 100 },
  { level: 'AMBASSADOR', min: 25 },
  { level: 'INSIDER', min: 0 },
];

const LEVEL_REWARDS: Record<AmbassadorLevel, string> = {
  INSIDER: 'Digital ID + stickers',
  AMBASSADOR: 'T-shirt + physical ID',
  LEADER: 'Hoodie + cap',
  ELITE: 'Limited-edition jacket + exclusive swag box',
};

export function computeLevel(bookingCount: number): AmbassadorLevel {
  return LEVEL_THRESHOLDS.find((t) => bookingCount >= t.min)!.level;
}

/** Bookings needed to reach the next level, or null if already at the top. */
export function nextLevelGap(
  bookingCount: number
): { level: AmbassadorLevel; remaining: number } | null {
  const next = [...LEVEL_THRESHOLDS].reverse().find((t) => bookingCount < t.min);
  return next ? { level: next.level, remaining: next.min - bookingCount } : null;
}

async function bookingCountsFor(ambassadorIds: string[]): Promise<Map<string, number>> {
  if (ambassadorIds.length === 0) return new Map();
  const rows = await prisma.eventRegistration.groupBy({
    by: ['referredByAmbassadorId'],
    where: { referredByAmbassadorId: { in: ambassadorIds }, status: 'REGISTERED' },
    _count: true,
  });
  return new Map(rows.map((r) => [r.referredByAmbassadorId as string, r._count]));
}

/**
 * Make sure a reward row exists for every level up to (and including) the
 * ambassador's current level — one row per level, created once, never
 * duplicated (unique on ambassadorId+level). Notifies on newly-unlocked
 * levels so the ambassador knows to add a shipping address.
 */
async function ensureRewardRows(ambassadorId: string, userId: string, level: AmbassadorLevel) {
  const upTo = AMBASSADOR_LEVELS.slice(0, AMBASSADOR_LEVELS.indexOf(level) + 1);
  const existing = await prisma.ambassadorReward.findMany({
    where: { ambassadorId },
    select: { level: true },
  });
  const have = new Set(existing.map((r) => r.level));
  const missing = upTo.filter((l) => !have.has(l));
  if (missing.length === 0) return;

  await prisma.ambassadorReward.createMany({
    data: missing.map((l) => ({ ambassadorId, level: l })),
    skipDuplicates: true,
  });

  for (const l of missing) {
    await notificationsService
      .createNotification(
        userId,
        'LEVEL_UP',
        `You've reached ${l.charAt(0) + l.slice(1).toLowerCase()} level!`,
        `Your reward — ${LEVEL_REWARDS[l]} — is ready. Add a shipping address so we can send it.`,
        { level: l }
      )
      .catch(() => {});
  }
}

export class AmbassadorsService {
  /**
   * Apply (or re-apply) to the ambassador program. One row per user, so a
   * re-application updates the existing record and resets it to APPLIED —
   * unless the user is already ACTIVE.
   */
  async apply(userId: string, dto: ApplyAmbassadorDto) {
    const existing = await prisma.ambassador.findUnique({ where: { userId } });
    if (existing?.status === 'ACTIVE') {
      throw new BadRequestError("You're already an active ambassador");
    }
    return prisma.ambassador.upsert({
      where: { userId },
      create: { userId, ...dto, status: 'APPLIED' },
      update: { ...dto, status: 'APPLIED', reviewNote: null, reviewedBy: null },
    });
  }

  /** The signed-in user's own application + status (or null if none). */
  async getMine(userId: string) {
    const ambassador = await prisma.ambassador.findUnique({ where: { userId } });
    if (!ambassador || ambassador.status !== 'ACTIVE') return ambassador;

    const bookingCount = (await bookingCountsFor([ambassador.id])).get(ambassador.id) ?? 0;
    const level = computeLevel(bookingCount);
    await ensureRewardRows(ambassador.id, userId, level);
    const rewards = await prisma.ambassadorReward.findMany({
      where: { ambassadorId: ambassador.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...ambassador,
      bookingCount,
      level,
      nextLevel: nextLevelGap(bookingCount),
      rewards,
    };
  }

  /** Set/update the shipping address on one of the caller's own reward rows. */
  async submitShippingAddress(userId: string, rewardId: string, address: SubmitShippingAddressDto) {
    const reward = await prisma.ambassadorReward.findUnique({
      where: { id: rewardId },
      include: { ambassador: { select: { userId: true } } },
    });
    if (!reward) throw new NotFoundError('Reward');
    if (reward.ambassador.userId !== userId) throw new ForbiddenError('Not your reward');
    if (reward.fulfillmentStatus !== 'PENDING') {
      throw new BadRequestError('This reward has already been dispatched');
    }
    return prisma.ambassadorReward.update({
      where: { id: rewardId },
      data: { shippingAddress: address },
    });
  }

  /** Admin fulfillment queue, optionally filtered by status. */
  async adminListRewards(status: string | undefined, page?: number, limit?: number) {
    const p = parsePaginationQuery({ page, limit });
    const where = status ? { fulfillmentStatus: status as RewardStatus } : {};
    const [rows, total] = await Promise.all([
      prisma.ambassadorReward.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        include: { ambassador: { include: { user: { select: PUBLIC_USER_SELECT } } } },
      }),
      prisma.ambassadorReward.count({ where }),
    ]);
    return { rewards: rows, pagination: buildPaginationMeta(total, p.page, p.limit) };
  }

  /** Admin: mark a reward dispatched with tracking info. Requires an address on file. */
  async dispatchReward(
    id: string,
    input: { trackingId: string; trackingProvider: string },
    actingAdminId: string
  ) {
    const reward = await prisma.ambassadorReward.findUnique({
      where: { id },
      include: { ambassador: { select: { userId: true } } },
    });
    if (!reward) throw new NotFoundError('Reward');
    if (!reward.shippingAddress) throw new BadRequestError('No shipping address on file yet');
    if (reward.fulfillmentStatus !== 'PENDING') {
      throw new BadRequestError('Reward has already been dispatched');
    }
    const updated = await prisma.ambassadorReward.update({
      where: { id },
      data: {
        fulfillmentStatus: 'DISPATCHED',
        trackingId: input.trackingId,
        trackingProvider: input.trackingProvider,
        dispatchedAt: new Date(),
      },
    });
    await notificationsService
      .createNotification(
        reward.ambassador.userId,
        'SYSTEM',
        'Your ambassador reward is on its way!',
        `Shipped via ${input.trackingProvider}. Tracking ID: ${input.trackingId}`,
        { rewardId: id }
      )
      .catch(() => {});
    await prisma.auditLog
      .create({
        data: {
          userId: actingAdminId,
          action: 'AMBASSADOR_REWARD_DISPATCHED',
          resource: 'AmbassadorReward',
          resourceId: id,
          metadata: { targetUserId: reward.ambassador.userId, ...input },
        },
      })
      .catch(() => {});
    return updated;
  }

  /** Admin: mark a dispatched reward as delivered. */
  async markRewardDelivered(id: string, actingAdminId: string) {
    const reward = await prisma.ambassadorReward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundError('Reward');
    if (reward.fulfillmentStatus !== 'DISPATCHED') {
      throw new BadRequestError('Reward must be dispatched before it can be marked delivered');
    }
    const updated = await prisma.ambassadorReward.update({
      where: { id },
      data: { fulfillmentStatus: 'DELIVERED', deliveredAt: new Date() },
    });
    await prisma.auditLog
      .create({
        data: {
          userId: actingAdminId,
          action: 'AMBASSADOR_REWARD_DELIVERED',
          resource: 'AmbassadorReward',
          resourceId: id,
        },
      })
      .catch(() => {});
    return updated;
  }

  /** Public directory: ACTIVE ambassadors only, optionally filtered by city. */
  async listActive(city?: string) {
    const rows = await prisma.ambassador.findMany({
      where: {
        status: 'ACTIVE',
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ city: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        city: true,
        region: true,
        createdAt: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });
    const counts = await bookingCountsFor(rows.map((r) => r.id));
    return rows.map((r) => {
      const bookingCount = counts.get(r.id) ?? 0;
      return { ...r, bookingCount, level: computeLevel(bookingCount) };
    });
  }

  /** Admin review queue, optionally filtered by status. */
  async adminList(status: string | undefined, page?: number, limit?: number) {
    const p = parsePaginationQuery({ page, limit });
    const where = status ? { status: status as ApplicationStatus } : {};
    const [rows, total] = await Promise.all([
      prisma.ambassador.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        include: { user: { select: PUBLIC_USER_SELECT } },
      }),
      prisma.ambassador.count({ where }),
    ]);
    const counts = await bookingCountsFor(
      rows.filter((r) => r.status === 'ACTIVE').map((r) => r.id)
    );
    const ambassadors = rows.map((r) => {
      const bookingCount = counts.get(r.id) ?? 0;
      return r.status === 'ACTIVE' ? { ...r, bookingCount, level: computeLevel(bookingCount) } : r;
    });
    return { ambassadors, pagination: buildPaginationMeta(total, p.page, p.limit) };
  }

  /** Resolve a `?ref=` code to an ACTIVE ambassador's id, or null if it doesn't match one. */
  async resolveReferralCode(code: string | undefined | null): Promise<string | null> {
    if (!code) return null;
    const ambassador = await prisma.ambassador.findUnique({
      where: { referralCode: code },
      select: { id: true, status: true },
    });
    return ambassador && ambassador.status === 'ACTIVE' ? ambassador.id : null;
  }

  /**
   * Admin: advance/set an application's status. The first time someone hits
   * ACTIVE they mint a referral code — that's what makes them Level 1
   * Insider (referral link starts working, booking count starts at 0).
   */
  async updateStatus(id: string, reviewerId: string, dto: UpdateAmbassadorStatusDto) {
    const existing = await prisma.ambassador.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Ambassador application');
    const needsReferralCode = dto.status === 'ACTIVE' && !existing.referralCode;
    const updated = await prisma.ambassador.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote ?? null,
        reviewedBy: reviewerId,
        ...(needsReferralCode ? { referralCode: randomShortToken(6) } : {}),
      },
    });
    // Seed the Level 1 Insider reward the moment they go ACTIVE.
    if (updated.status === 'ACTIVE') {
      await ensureRewardRows(updated.id, updated.userId, 'INSIDER').catch(() => {});
    }
    return updated;
  }
}

type ApplicationStatus = 'APPLIED' | 'INTERVIEW' | 'ACTIVE' | 'REJECTED';
type RewardStatus = 'PENDING' | 'DISPATCHED' | 'DELIVERED';

export default new AmbassadorsService();
