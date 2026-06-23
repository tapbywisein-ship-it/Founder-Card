import prisma from '@config/database';
import { NotFoundError, BadRequestError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { FileReportDto, ActionReportDto } from './reports.validation';

export class ReportsService {
  /**
   * Anyone can file a report. Service confirms the target exists for USER /
   * EVENT cases so we don't accept clearly-bogus reports.
   */
  async fileReport(reporterId: string, dto: FileReportDto) {
    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestError("You can't report yourself");
    }
    if (dto.targetType === 'USER') {
      const user = await prisma.user.findUnique({ where: { id: dto.targetId } });
      if (!user) throw new NotFoundError('User');
    } else if (dto.targetType === 'EVENT') {
      const event = await prisma.event.findUnique({ where: { id: dto.targetId } });
      if (!event) throw new NotFoundError('Event');
    }

    return prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
        reason: dto.reason,
        status: 'OPEN',
      },
    });
  }

  /** Admin moderation queue, paginated + filterable by status. */
  async listReports(
    filters: { status?: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED' },
    page?: number,
    limit?: number
  ) {
    const pagination = parsePaginationQuery({ page, limit });
    const where = filters.status ? { status: filters.status } : {};

    const [rows, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            include: {
              profile: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
          reviewer: {
            include: {
              profile: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.report.count({ where }),
    ]);

    return {
      reports: rows,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /**
   * Apply a moderation action. Each action is logged to AuditLog so the trail
   * is queryable later. Side-effects (user ban, event remove) are scoped and
   * don't cascade into deletion — banned users keep their data so reports
   * against them remain investigable.
   */
  async actionReport(reportId: string, reviewerId: string, dto: ActionReportDto) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Report');

    const newStatus =
      dto.action === 'DISMISS'
        ? 'DISMISSED'
        : dto.action === 'MARK_REVIEWING'
          ? 'REVIEWING'
          : 'ACTIONED';

    if (dto.action === 'ACTION_USER_BAN' && report.targetType === 'USER') {
      await prisma.user.update({
        where: { id: report.targetId },
        data: { isActive: false },
      });
    } else if (dto.action === 'ACTION_EVENT_REMOVE' && report.targetType === 'EVENT') {
      await prisma.event.update({
        where: { id: report.targetId },
        data: { status: 'CANCELLED', deletedAt: new Date() },
      });
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewerId,
        resolution: dto.resolution ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: reviewerId,
        action: `report.${dto.action}`,
        resource: 'Report',
        resourceId: reportId,
        metadata: {
          targetType: report.targetType,
          targetId: report.targetId,
          resolution: dto.resolution ?? null,
        },
      },
    });

    return updated;
  }
}

export default new ReportsService();
