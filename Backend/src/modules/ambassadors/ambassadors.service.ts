import prisma from '@config/database';
import { BadRequestError, NotFoundError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { randomShortToken } from '@utils/slug';
import { ApplyAmbassadorDto, UpdateAmbassadorStatusDto } from './ambassadors.validation';

// Public-safe user fields for the directory (never expose email/private data).
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  profile: { select: { firstName: true, lastName: true, avatar: true, company: true, position: true } },
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

export function computeLevel(bookingCount: number): AmbassadorLevel {
  return LEVEL_THRESHOLDS.find((t) => bookingCount >= t.min)!.level;
}

/** Bookings needed to reach the next level, or null if already at the top. */
export function nextLevelGap(bookingCount: number): { level: AmbassadorLevel; remaining: number } | null {
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
    return {
      ...ambassador,
      bookingCount,
      level: computeLevel(bookingCount),
      nextLevel: nextLevelGap(bookingCount),
    };
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
    const counts = await bookingCountsFor(rows.filter((r) => r.status === 'ACTIVE').map((r) => r.id));
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
    return prisma.ambassador.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote ?? null,
        reviewedBy: reviewerId,
        ...(needsReferralCode ? { referralCode: randomShortToken(6) } : {}),
      },
    });
  }
}

type ApplicationStatus = 'APPLIED' | 'INTERVIEW' | 'ACTIVE' | 'REJECTED';

export default new AmbassadorsService();
