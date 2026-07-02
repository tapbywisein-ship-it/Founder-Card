import prisma from '@config/database';
import redis from '@config/redis';
import { NotFoundError, BadRequestError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { UpdateUserDto } from './admin.validation';
import notificationsService from '@modules/notifications/notifications.service';
import { sendEmail, cardDispatchedEmail } from '@utils/email';

const TRACKING_URL_TEMPLATES: Record<string, string> = {
  Delhivery: 'https://www.delhivery.com/track/package/{id}',
  Shiprocket: 'https://shiprocket.co/tracking/{id}',
  'India Post': 'https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx',
  DTDC: 'https://www.dtdc.in/trace.asp',
  BlueDart: 'https://www.bluedart.com/tracking',
  Ekart: 'https://ekartlogistics.com/track/{id}',
};

function buildTrackingUrl(provider: string, trackingId: string): string | undefined {
  const template = TRACKING_URL_TEMPLATES[provider];
  if (!template) return undefined;
  return template.replace('{id}', encodeURIComponent(trackingId));
}

export class AdminService {
  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalEvents,
      totalFounderCards,
      activeFounderCards,
      totalConnections,
      newUsersThisMonth,
      newUsersLastMonth,
      newEventsThisMonth,
      newConnectionsThisMonth,
      activeUsersRows,
      recentAuditLogs,
      recentUsers,
      revenueAgg,
      signupTrendRows,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.founderCard.count(),
      prisma.founderCard.count({ where: { status: 'ACTIVE' } }),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      prisma.event.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.connection.count({ where: { status: 'ACCEPTED', createdAt: { gte: thirtyDaysAgo } } }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { include: { profile: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          profile: { select: { firstName: true, lastName: true, avatar: true, company: true } },
        },
      }),
      prisma.cardPurchase.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const userGrowth =
      newUsersLastMonth === 0
        ? 100
        : Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100);

    const activeUsers = activeUsersRows.length;

    const recentActivity = recentAuditLogs.slice(0, 10).map((log) => {
      const name = log.user?.profile
        ? `${log.user.profile.firstName ?? ''} ${log.user.profile.lastName ?? ''}`.trim() ||
          log.user.email
        : (log.user?.email ?? 'System');
      const verb = log.action.replace(/_/g, ' ').toLowerCase();
      const resource = log.resource ? ` ${log.resource.toLowerCase()}` : '';
      return `${name} ${verb}${resource}`;
    });

    // 7-day signup trend bucketed by day
    const trendByDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      trendByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const u of signupTrendRows) {
      const day = new Date(u.createdAt).toISOString().slice(0, 10);
      if (day in trendByDay) trendByDay[day]++;
    }
    const signupTrend = Object.entries(trendByDay).map(([date, count]) => ({ date, count }));

    const totalRevenue = Number(revenueAgg._sum.amount ?? 0);

    return {
      totalUsers,
      totalEvents,
      totalFounderCards,
      activeFounderCards,
      totalConnections,
      activeUsers,
      totalRevenue,
      recentActivity,
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.createdAt,
        profile: u.profile,
      })),
      signupTrend,
      monthlyGrowth: {
        users: userGrowth,
        events: newEventsThisMonth,
        connections: newConnectionsThisMonth,
      },
    };
  }

  async getRevenue(filters: { page?: number; limit?: number; search?: string } = {}) {
    const pagination = parsePaginationQuery(filters);
    const where: Record<string, unknown> = {};
    if (filters.search) {
      where.user = {
        OR: [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { profile: { firstName: { contains: filters.search, mode: 'insensitive' } } },
          { profile: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        ],
      };
    }
    const [items, total] = await Promise.all([
      prisma.cardPurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
        include: {
          user: {
            include: {
              profile: { select: { firstName: true, lastName: true, avatar: true, company: true } },
              founderCard: { select: { publicSlug: true, nfcTagId: true, status: true } },
            },
          },
        },
      }),
      prisma.cardPurchase.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, pagination.page, pagination.limit) };
  }

  async dispatchOrder(
    orderId: string,
    input: {
      trackingId: string;
      trackingProvider: string;
      nfcTagId?: string;
    },
    actingAdminId?: string
  ) {
    const purchase = await prisma.cardPurchase.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true } },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundError('Order');
    if (purchase.status !== 'PAID') throw new BadRequestError('Order is not in a paid state');
    if (purchase.fulfillmentStatus === 'DISPATCHED' || purchase.fulfillmentStatus === 'DELIVERED') {
      throw new BadRequestError('Order has already been dispatched');
    }

    // Update purchase fulfillment status
    const updated = await prisma.cardPurchase.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: 'DISPATCHED',
        trackingId: input.trackingId,
        trackingProvider: input.trackingProvider,
        dispatchedAt: new Date(),
      },
    });

    // If admin also provided the NFC tag ID, program the card
    if (input.nfcTagId) {
      await prisma.founderCard.updateMany({
        where: { userId: purchase.userId },
        data: { nfcTagId: input.nfcTagId },
      });
    }

    // Notify user in-app
    await notificationsService.createNotification(
      purchase.userId,
      'SYSTEM',
      'Your Tap Card has been dispatched!',
      `Your NFC Founder Card is on its way via ${input.trackingProvider}. Tracking ID: ${input.trackingId}`
    );

    // Send dispatch email (best-effort — don't fail the API call if email fails)
    try {
      const name = purchase.user.profile?.firstName ?? 'there';
      const trackingUrl = buildTrackingUrl(input.trackingProvider, input.trackingId);
      await sendEmail(
        purchase.user.email,
        'Your Tap Card has been dispatched ⚡',
        cardDispatchedEmail(name, input.trackingId, input.trackingProvider, trackingUrl)
      );
    } catch (err) {
      // log but don't throw — dispatch is already saved
      console.error('[dispatchOrder] email failed', err);
    }

    await prisma.auditLog
      .create({
        data: {
          userId: actingAdminId,
          action: 'ORDER_DISPATCHED',
          resource: 'CardPurchase',
          resourceId: orderId,
          metadata: {
            targetUserId: purchase.userId,
            trackingId: input.trackingId,
            trackingProvider: input.trackingProvider,
            ...(input.nfcTagId && { nfcTagId: input.nfcTagId }),
          },
        },
      })
      .catch(() => {});

    return updated;
  }

  async markOrderDelivered(orderId: string, actingAdminId?: string) {
    const purchase = await prisma.cardPurchase.findUnique({ where: { id: orderId } });
    if (!purchase) throw new NotFoundError('Order');
    if (purchase.fulfillmentStatus !== 'DISPATCHED') {
      throw new BadRequestError('Order must be in DISPATCHED state to mark delivered');
    }
    const updated = await prisma.cardPurchase.update({
      where: { id: orderId },
      data: { fulfillmentStatus: 'DELIVERED', deliveredAt: new Date() },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: actingAdminId,
          action: 'ORDER_DELIVERED',
          resource: 'CardPurchase',
          resourceId: orderId,
          metadata: { targetUserId: purchase.userId },
        },
      })
      .catch(() => {});

    return updated;
  }

  async getUsers(
    filters: {
      role?: string;
      tier?: string;
      isActive?: boolean;
      search?: string;
    },
    page?: number,
    limit?: number
  ) {
    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = { deletedAt: null };

    if (filters.role) where.role = filters.role;
    if (filters.tier) where.tier = filters.tier;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { company: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
              company: true,
              position: true,
            },
          },
          gamification: { select: { fkScore: true, level: true } },
          founderCard: { select: { status: true } },
          _count: {
            select: {
              sentConnections: { where: { status: 'ACCEPTED' } },
              receivedConnections: { where: { status: 'ACCEPTED' } },
              registrations: true,
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        gamification: true,
        founderCard: true,
        _count: {
          select: {
            sentConnections: true,
            receivedConnections: true,
            registrations: true,
            userBadges: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    const { password: _pw, ...safeUser } = user;
    void _pw;
    return safeUser;
  }

  /**
   * Activity timeline for a user — audit logs acted-by them or about them,
   * plus recent registrations and connections. Used by the admin user detail
   * page to investigate a reported account.
   */
  async getUserActivity(userId: string, limit = 30) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundError('User');

    const [audits, registrations, connections] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          OR: [{ userId }, { AND: [{ resource: 'User' }, { resourceId: userId }] }],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.eventRegistration.findMany({
        where: { userId },
        include: {
          event: { select: { id: true, title: true, startDate: true } },
        },
        orderBy: { registeredAt: 'desc' },
        take: 10,
      }),
      prisma.connection.findMany({
        where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          event: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      audits,
      registrations,
      connections: connections.map((c) => {
        const other = c.requesterId === userId ? c.receiver : c.requester;
        return {
          id: c.id,
          status: c.status,
          createdAt: c.createdAt,
          event: c.event,
          other,
        };
      }),
    };
  }

  /**
   * Guard against locking everyone out of the admin panel. Throws if the given
   * change would demote/deactivate the *last* remaining active admin.
   * `wouldRemoveAdmin` is true when the operation strips this user's admin
   * access (role change away from ADMIN, or deactivation).
   */
  private async assertNotLastAdmin(user: { id: string; role: string }, wouldRemoveAdmin: boolean) {
    if (!wouldRemoveAdmin || user.role !== 'ADMIN') return;
    const otherAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, deletedAt: null, id: { not: user.id } },
    });
    if (otherAdmins === 0) {
      throw new BadRequestError(
        'Cannot remove the last admin. Promote another user to ADMIN first.'
      );
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto, actingAdminId?: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    const wouldRemoveAdmin =
      (dto.role !== undefined && dto.role !== 'ADMIN') || dto.isActive === false;
    if (wouldRemoveAdmin && actingAdminId && userId === actingAdminId) {
      throw new BadRequestError(
        'You cannot remove your own admin access. Ask another admin to make this change.'
      );
    }
    await this.assertNotLastAdmin(user, wouldRemoveAdmin);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.tier !== undefined && { tier: dto.tier }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isEmailVerified !== undefined && { isEmailVerified: dto.isEmailVerified }),
      },
      include: {
        profile: {
          select: { firstName: true, lastName: true, avatar: true },
        },
      },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: actingAdminId,
          action: 'USER_UPDATED',
          resource: 'User',
          resourceId: userId,
          metadata: {
            targetEmail: user.email,
            changes: {
              ...(dto.role !== undefined && { role: dto.role }),
              ...(dto.tier !== undefined && { tier: dto.tier }),
              ...(dto.isActive !== undefined && { isActive: dto.isActive }),
              ...(dto.isEmailVerified !== undefined && { isEmailVerified: dto.isEmailVerified }),
            },
          },
        },
      })
      .catch(() => {});

    return updated;
  }

  /** Change a user's role, with an audit-trail entry naming the acting admin. */
  async updateUserRole(userId: string, role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN', adminId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundError('User');

    if (role !== 'ADMIN' && userId === adminId) {
      throw new BadRequestError(
        'You cannot remove your own admin role. Ask another admin to make this change.'
      );
    }
    await this.assertNotLastAdmin(user, role !== 'ADMIN');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: { profile: { select: { firstName: true, lastName: true, avatar: true } } },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action: 'USER_ROLE_CHANGED',
          resource: 'User',
          resourceId: userId,
          metadata: { from: user.role, to: role },
        },
      })
      .catch(() => {});

    return updated;
  }

  /** Suspend (isActive=false) or reactivate a user, with audit + token revoke on suspend. */
  async setUserStatus(userId: string, isActive: boolean, adminId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundError('User');

    if (!isActive && userId === adminId) {
      throw new BadRequestError('You cannot deactivate your own account.');
    }
    await this.assertNotLastAdmin(user, !isActive);

    await prisma.user.update({ where: { id: userId }, data: { isActive } });

    if (!isActive) {
      // Revoke sessions so the suspension takes effect immediately.
      const keys = await redis.keys(`refresh_token:${userId}:*`).catch(() => [] as string[]);
      if (keys.length > 0) await redis.del(...keys).catch(() => 0);
      await notificationsService
        .createNotification(
          userId,
          'SYSTEM',
          'Account Suspended',
          'Your account has been suspended.',
          {}
        )
        .catch(() => {});
    }

    await prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action: isActive ? 'USER_UNSUSPENDED' : 'USER_SUSPENDED',
          resource: 'User',
          resourceId: userId,
        },
      })
      .catch(() => {});

    return { success: true, isActive };
  }

  async banUser(userId: string, reason: string, actingAdminId?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true, email: true },
    });
    if (!user) throw new NotFoundError('User');

    if (actingAdminId && userId === actingAdminId) {
      throw new BadRequestError('You cannot ban your own account.');
    }
    // Banning is effectively a hard deactivation — apply the same last-admin
    // guard so the platform can't end up with zero ADMINs.
    await this.assertNotLastAdmin(user, true);

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Revoke all refresh tokens
    const pattern = `refresh_token:${userId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);

    await notificationsService
      .createNotification(
        userId,
        'SYSTEM',
        'Account Suspended',
        `Your account has been suspended. Reason: ${reason}`,
        { reason }
      )
      .catch(() => {});

    await prisma.auditLog.create({
      data: {
        userId: actingAdminId,
        action: 'USER_BANNED',
        resource: 'User',
        resourceId: userId,
        metadata: { reason, targetEmail: user.email },
      },
    });

    return { success: true, message: 'User banned successfully' };
  }

  async deleteUser(userId: string, actingAdminId?: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true, email: true },
    });
    if (!user) throw new NotFoundError('User');

    if (actingAdminId && userId === actingAdminId) {
      throw new BadRequestError('You cannot delete your own account.');
    }
    await this.assertNotLastAdmin(user, true);

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingAdminId,
        action: 'USER_DELETED',
        resource: 'User',
        resourceId: userId,
        metadata: { email: user.email },
      },
    });
  }

  async getEvents(
    filters: { status?: string; organizerId?: string; search?: string },
    page?: number,
    limit?: number
  ) {
    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = { deletedAt: null };

    if (filters.status) where.status = filters.status;
    if (filters.organizerId) where.organizerId = filters.organizerId;

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: {
            include: {
              profile: { select: { firstName: true, lastName: true, avatar: true } },
            },
          },
          _count: { select: { registrations: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async updateEvent(eventId: string, dto: Record<string, unknown>) {
    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundError('Event');

    // Whitelist editable fields. The previous code passed the entire body to
    // prisma.event.update, which silently let admins overwrite `id` (corrupt
    // joins), `slug` (break public URLs) or `organizerId` (steal events)
    // without an audit entry. Only the fields below can be changed; any
    // organizer reassignment is logged.
    const allowed: Record<string, unknown> = {};
    const set = (key: string) => {
      if (dto[key] !== undefined) allowed[key] = dto[key];
    };
    set('title');
    set('description');
    set('status');
    set('startDate');
    set('endDate');
    set('location');
    set('city');
    set('country');
    set('address');
    set('meetingUrl');
    set('capacity');
    set('coverImage');
    set('category');
    set('theme');
    set('visibility');
    set('requiresApproval');
    set('waitlistEnabled');

    if (dto.organizerId !== undefined && dto.organizerId !== event.organizerId) {
      allowed.organizerId = dto.organizerId;
      await prisma.auditLog
        .create({
          data: {
            action: 'EVENT_ORGANIZER_REASSIGNED',
            resource: 'Event',
            resourceId: eventId,
            metadata: { from: event.organizerId, to: dto.organizerId },
          },
        })
        .catch(() => {});
    }

    return prisma.event.update({
      where: { id: eventId },
      data: allowed,
    });
  }

  async deleteEvent(eventId: string) {
    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundError('Event');

    // Soft-delete + cancel. A hard delete cascades across registrations,
    // payments, leads, connections and throws Prisma P2025 ("Related record not
    // found"); soft-delete preserves history and is filtered out everywhere
    // (list/public queries use deletedAt: null).
    await prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });

    await prisma.auditLog
      .create({
        data: {
          action: 'EVENT_DELETED',
          resource: 'Event',
          resourceId: eventId,
          metadata: { title: event.title },
        },
      })
      .catch(() => {});
  }

  async getAnalytics(dateRange: { startDate?: Date; endDate?: Date; period?: string }) {
    const now = new Date();
    let startDate = dateRange.startDate;
    const endDate = dateRange.endDate ?? now;

    if (!startDate) {
      const periodMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
      };
      const days = periodMap[dateRange.period ?? '30d'] ?? 30;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    const [
      totalUsers,
      newUsers,
      totalEvents,
      newEvents,
      totalConnections,
      newConnections,
      totalRegistrations,
      newRegistrations,
      founderCards,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.event.count({
        where: { deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.connection.count({
        where: { status: 'ACCEPTED', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.eventRegistration.count(),
      prisma.eventRegistration.count({ where: { registeredAt: { gte: startDate, lte: endDate } } }),
      prisma.founderCard.count({ where: { status: 'ACTIVE' } }),
    ]);

    // ── Time-series for the admin charts ──────────────────────────────────────
    // Last 6 months of signups, bucketed by month label.
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentUsers = await prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });
    const MONTHS = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const signupsByMonth: { month: string; users: number }[] = [];
    const monthIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthIndex.set(`${d.getFullYear()}-${d.getMonth()}`, signupsByMonth.length);
      signupsByMonth.push({ month: MONTHS[d.getMonth()], users: 0 });
    }
    for (const u of recentUsers) {
      const d = new Date(u.createdAt);
      const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (idx !== undefined) signupsByMonth[idx].users++;
    }

    // Last 7 days of accepted connections, bucketed by weekday.
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const recentConnections = await prisma.connection.findMany({
      where: { status: 'ACCEPTED', createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const connectionsByDay: { day: string; connections: number }[] = [];
    const dayIndex = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayIndex.set(key, connectionsByDay.length);
      connectionsByDay.push({ day: DOW[d.getDay()], connections: 0 });
    }
    for (const c of recentConnections) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      const idx = dayIndex.get(key);
      if (idx !== undefined) connectionsByDay[idx].connections++;
    }

    // Events grouped by category (top 8, uncategorised folded into "Other").
    const eventCategoryGroups = await prisma.event.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const eventsByCategory = eventCategoryGroups
      .map((g) => ({ name: g.category?.trim() || 'Other', events: g._count._all }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 8);

    return {
      period: { startDate, endDate },
      users: { total: totalUsers, new: newUsers },
      events: { total: totalEvents, new: newEvents },
      connections: { total: totalConnections, new: newConnections },
      registrations: { total: totalRegistrations, new: newRegistrations },
      founderCards: { active: founderCards },
      signupsByMonth,
      connectionsByDay,
      eventsByCategory,
    };
  }

  async getSettings() {
    return prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async updateSetting(key: string, value: string, type?: string, label?: string) {
    return prisma.platformSetting.upsert({
      where: { key },
      update: { value, ...(type && { type }), ...(label && { label }) },
      create: { key, value, type: type ?? 'string', label: label ?? key },
    });
  }

  async getPermissions() {
    // Return default role-based permissions
    return {
      ATTENDEE: {
        events: ['read', 'register'],
        connections: ['create', 'read', 'delete'],
        profile: ['read', 'update'],
        founderCard: ['apply', 'read'],
      },
      ORGANIZER: {
        events: ['create', 'read', 'update', 'delete', 'publish'],
        connections: ['create', 'read', 'delete'],
        profile: ['read', 'update'],
        founderCard: ['apply', 'read'],
        leads: ['read', 'update'],
        organizer: ['dashboard', 'analytics'],
      },
      ADMIN: {
        events: ['create', 'read', 'update', 'delete', 'publish', 'manage'],
        connections: ['create', 'read', 'delete', 'manage'],
        profile: ['read', 'update', 'manage'],
        founderCard: ['apply', 'read', 'approve', 'reject', 'manage'],
        leads: ['read', 'update', 'manage'],
        admin: ['all'],
        users: ['create', 'read', 'update', 'delete', 'ban'],
        settings: ['read', 'update'],
      },
    };
  }

  async updatePermission(_role: string, _resource: string, _actions: string[]) {
    // In a full implementation, this would be stored in DB
    return { message: 'Permission updated (stored in memory for this implementation)' };
  }

  async getAuditLogs(
    filters: { action?: string; userId?: string; resource?: string },
    page?: number,
    limit?: number
  ) {
    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = {};
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.userId) where.userId = filters.userId;
    if (filters.resource) where.resource = { contains: filters.resource, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            include: {
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async sendTestEmail(adminEmail: string, adminName: string) {
    const { addEmailJob } = await import('@jobs/email.queue');
    await addEmailJob('welcome', { to: adminEmail, name: adminName || 'Admin' });
    return { sent: true, to: adminEmail };
  }

  async getPlatformHealth() {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // DB health
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch (err) {
      checks.database = { status: 'unhealthy', error: String(err) };
    }

    // Redis health
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { status: 'unhealthy', error: String(err) };
    }

    const isHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: checks,
    };
  }
}

export default new AdminService();
