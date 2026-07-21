import prisma from '@config/database';
import { BadRequestError, NotFoundError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { ApplyAmbassadorDto, UpdateAmbassadorStatusDto } from './ambassadors.validation';

// Public-safe user fields for the directory (never expose email/private data).
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  profile: { select: { firstName: true, lastName: true, avatar: true, company: true, position: true } },
} as const;

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
    return prisma.ambassador.findUnique({ where: { userId } });
  }

  /** Public directory: ACTIVE ambassadors only, optionally filtered by city. */
  async listActive(city?: string) {
    return prisma.ambassador.findMany({
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
    return { ambassadors: rows, pagination: buildPaginationMeta(total, p.page, p.limit) };
  }

  /** Admin: advance/set an application's status. */
  async updateStatus(id: string, reviewerId: string, dto: UpdateAmbassadorStatusDto) {
    const existing = await prisma.ambassador.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Ambassador application');
    return prisma.ambassador.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote ?? null, reviewedBy: reviewerId },
    });
  }
}

type ApplicationStatus = 'APPLIED' | 'INTERVIEW' | 'ACTIVE' | 'REJECTED';

export default new AmbassadorsService();
