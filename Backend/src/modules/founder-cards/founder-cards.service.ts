import prisma from '@config/database';
import { NotFoundError, ConflictError, BadRequestError } from '@utils/errors';
import { generateQRCode } from '@utils/qrcode';
import { cardIdToSlug } from '@utils/slug';
import { SCORE_VALUES } from '@config/constants';
import { sendEmail, founderCardApprovedEmail } from '@utils/email';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import gamificationService from '@modules/gamification/gamification.service';
import notificationsService from '@modules/notifications/notifications.service';
import { ApplyCardDto } from './founder-cards.validation';
import { buildVCard } from '@utils/calendar';
import { env } from '@config/env';

export class FounderCardsService {
  async applyForCard(userId: string, dto: ApplyCardDto) {
    const existingCard = await prisma.founderCard.findUnique({ where: { userId } });

    if (existingCard) {
      if (existingCard.status === 'PENDING') {
        throw new ConflictError('You already have a pending Founder Card application');
      }
      if (existingCard.status === 'ACTIVE') {
        throw new ConflictError('You already have an active Founder Card');
      }
      if (existingCard.status === 'DEACTIVATED') {
        // Allow re-application for deactivated cards
        return prisma.founderCard.update({
          where: { userId },
          data: {
            status: 'PENDING',
            message: dto.message ?? null,
            reason: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        });
      }
      // Rejected - allow re-application
      return prisma.founderCard.update({
        where: { userId },
        data: {
          status: 'PENDING',
          message: dto.message ?? null,
          reason: null,
          reviewedAt: null,
          reviewedBy: null,
        },
      });
    }

    let card = await prisma.founderCard.create({
      data: {
        userId,
        status: 'PENDING',
        message: dto.message ?? null,
      },
    });

    // Stable public slug, derived from the card id so it's reproducible.
    const slug = cardIdToSlug(card.id);
    card = await prisma.founderCard.update({
      where: { id: card.id },
      data: { publicSlug: slug },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, deletedAt: null },
      select: { id: true },
    });

    const adminIds = admins.map((a) => a.id);
    if (adminIds.length > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      const name = user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : (user?.email ?? 'A user');

      await notificationsService
        .sendBulkNotification(
          adminIds,
          'SYSTEM',
          'New Founder Card Application',
          `${name} has applied for a Founder Card`,
          { cardId: card.id, userId }
        )
        .catch(() => {});
    }

    return card;
  }

  /** Mint the next human-readable member ID: TW-00001, TW-00002, … */
  private async generateMemberId(): Promise<string> {
    const rows = await prisma.$queryRaw<
      { nextval: bigint }[]
    >`SELECT nextval('founder_member_seq') AS nextval`;
    const n = Number(rows[0]?.nextval ?? 0);
    return `TW-${String(n).padStart(5, '0')}`;
  }

  /**
   * Auto-issue an ACTIVE Founder Card the moment a user finishes onboarding.
   * Idempotent: if the user already has a card we only backfill any missing
   * memberId/slug/qr (and heal a legacy PENDING/REJECTED card to ACTIVE),
   * never creating a duplicate. Returns the live card.
   */
  async autoIssueCard(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tier: true },
    });
    if (!user) throw new NotFoundError('User');

    // upsert is atomic — concurrent onboarding calls can't both create a card.
    let card = await prisma.founderCard.upsert({
      where: { userId },
      create: { userId, status: 'ACTIVE', reviewedAt: new Date() },
      update: {},
    });

    const data: Record<string, unknown> = {};
    if (!card.memberId) data.memberId = await this.generateMemberId();
    if (!card.publicSlug) data.publicSlug = cardIdToSlug(card.id);
    if (!card.qrCode) {
      const qrPayload = Buffer.from(
        JSON.stringify({ userId, type: 'founder_card', timestamp: Date.now() })
      ).toString('base64');
      const qr = await generateQRCode(qrPayload);
      data.qrCode = qr;
      data.qrCodeUrl = qr;
    }
    if (card.status !== 'ACTIVE') {
      data.status = 'ACTIVE';
      data.reviewedAt = new Date();
    }
    if (Object.keys(data).length > 0) {
      card = await prisma.founderCard.update({ where: { id: card.id }, data });
    }

    // First activation perks: FOUNDER tier + one-time score award. The tier
    // flip is the atomic gate — updateMany returns count=1 only for the row
    // that actually transitioned FREE -> FOUNDER, so two concurrent onboarding
    // calls can't both award the score.
    const tierFlip = await prisma.user.updateMany({
      where: { id: userId, tier: { not: 'FOUNDER' } },
      data: { tier: 'FOUNDER' },
    });
    if (tierFlip.count === 1) {
      await gamificationService
        .addScore(userId, 'FOUNDER_CARD_ACTIVE', SCORE_VALUES.FOUNDER_CARD_ACTIVE, {
          cardId: card.id,
        })
        .catch(() => {});
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: 'FOUNDER_CARD_ISSUED',
            resource: 'FounderCard',
            resourceId: card.id,
          },
        })
        .catch(() => {});
    } else {
      // Re-onboarding case: tier was already FOUNDER, no score re-award, but
      // record that an issuance happened so the audit trail isn't lost.
      await prisma.auditLog
        .create({
          data: {
            userId,
            action: 'FOUNDER_CARD_REISSUED',
            resource: 'FounderCard',
            resourceId: card.id,
          },
        })
        .catch(() => {});
    }

    return card;
  }

  async getMyCard(userId: string) {
    const card = await prisma.founderCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundError('Founder Card');
    const purchase = await prisma.cardPurchase.findFirst({
      where: { userId, status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: {
        fulfillmentStatus: true,
        trackingId: true,
        trackingProvider: true,
        dispatchedAt: true,
        deliveredAt: true,
      },
    });
    return {
      ...card,
      physicalCardOrdered: !!purchase,
      fulfillmentStatus: purchase?.fulfillmentStatus ?? null,
      trackingId: purchase?.trackingId ?? null,
      trackingProvider: purchase?.trackingProvider ?? null,
      dispatchedAt: purchase?.dispatchedAt ?? null,
      deliveredAt: purchase?.deliveredAt ?? null,
    };
  }

  /** Fire a throttled "viewed your card" notification (≤1 per viewer/owner/day). */
  private async notifyCardViewed(ownerId: string, viewerId?: string): Promise<void> {
    if (!viewerId || viewerId === ownerId) return;
    try {
      const redis = (await import('@config/redis')).default;
      const key = `card-view-notif:${ownerId}:${viewerId}`;
      const existing = await redis.get(key).catch(() => null);
      if (existing) return;
      await redis.setex(key, 86400, '1').catch(() => {});
      const viewer = await prisma.user.findUnique({
        where: { id: viewerId },
        select: { profile: { select: { firstName: true, lastName: true } } },
      });
      const viewerName = viewer?.profile
        ? `${viewer.profile.firstName} ${viewer.profile.lastName}`.trim()
        : 'Someone';
      await notificationsService.createNotification(
        ownerId,
        'CARD_VIEWED',
        'Someone viewed your Founder Card',
        `${viewerName} viewed your Founder Card`,
        { viewerId }
      );
    } catch {
      /* best-effort, never block the page render */
    }
  }

  /** Persist a card view for analytics. Skips self-views; anonymous views (no
   *  viewerId) are still counted. Best-effort — never blocks page render. */
  private async recordCardView(ownerId: string, viewerId?: string): Promise<void> {
    if (viewerId && viewerId === ownerId) return;
    try {
      await prisma.cardView.create({ data: { ownerId, viewerId: viewerId ?? null } });
    } catch {
      /* best-effort */
    }
  }

  /**
   * Analytics for the signed-in user's own Tap Card: total + unique views,
   * recent viewers (named when not anonymous), taps, connections, and a 14-day
   * view timeseries for a sparkline.
   */
  async getCardAnalytics(userId: string) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [totalViews, uniqueViewerRows, recentViews, taps, connections, windowViews] =
      await Promise.all([
        prisma.cardView.count({ where: { ownerId: userId } }),
        prisma.cardView.findMany({
          where: { ownerId: userId, viewerId: { not: null } },
          distinct: ['viewerId'],
          select: { viewerId: true },
        }),
        prisma.cardView.findMany({
          where: { ownerId: userId },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            viewer: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    company: true,
                    position: true,
                  },
                },
              },
            },
          },
        }),
        prisma.eventTap.count({ where: { targetUserId: userId } }),
        prisma.connection.count({
          where: { OR: [{ requesterId: userId }, { receiverId: userId }], status: 'ACCEPTED' },
        }),
        prisma.cardView.findMany({
          where: { ownerId: userId, createdAt: { gte: since } },
          select: { createdAt: true },
        }),
      ]);

    // Build a 14-day daily bucket (oldest → newest) for the sparkline.
    const days: { date: string; views: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, views: 0 });
    }
    const byDay = new Map(days.map((d) => [d.date, d]));
    for (const v of windowViews) {
      const key = v.createdAt.toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) bucket.views += 1;
    }

    return {
      totalViews,
      uniqueViewers: uniqueViewerRows.length,
      taps,
      connections,
      timeseries: days,
      recentViewers: recentViews.map((v) => ({
        id: v.id,
        at: v.createdAt,
        anonymous: !v.viewer,
        userId: v.viewer?.id ?? null,
        name: v.viewer?.profile
          ? `${v.viewer.profile.firstName ?? ''} ${v.viewer.profile.lastName ?? ''}`.trim() ||
            'Member'
          : null,
        avatar: v.viewer?.profile?.avatar ?? null,
        company: v.viewer?.profile?.company ?? null,
        position: v.viewer?.profile?.position ?? null,
      })),
    };
  }

  // ── Card content blocks (deck / video / booking / link) ───────────────────

  private static readonly BLOCK_TYPES = ['link', 'video', 'deck', 'booking', 'portfolio'];

  async listBlocks(userId: string) {
    return prisma.cardBlock.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createBlock(userId: string, input: { type?: string; label: string; url: string }) {
    const label = input.label?.trim();
    const url = input.url?.trim();
    if (!label) throw new BadRequestError('Label is required');
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new BadRequestError('A valid URL (starting with http:// or https://) is required');
    }
    const type = FounderCardsService.BLOCK_TYPES.includes(input.type ?? '')
      ? (input.type as string)
      : 'link';

    const count = await prisma.cardBlock.count({ where: { userId } });
    if (count >= 12) throw new BadRequestError('You can add up to 12 blocks');

    return prisma.cardBlock.create({
      data: { userId, type, label: label.slice(0, 80), url, sortOrder: count },
    });
  }

  async updateBlock(
    userId: string,
    blockId: string,
    input: { type?: string; label?: string; url?: string }
  ) {
    const block = await prisma.cardBlock.findUnique({ where: { id: blockId } });
    if (!block || block.userId !== userId) throw new NotFoundError('Block');

    const data: { type?: string; label?: string; url?: string } = {};
    if (input.label !== undefined) {
      const label = input.label.trim();
      if (!label) throw new BadRequestError('Label cannot be empty');
      data.label = label.slice(0, 80);
    }
    if (input.url !== undefined) {
      const url = input.url.trim();
      if (!/^https?:\/\//i.test(url)) throw new BadRequestError('A valid URL is required');
      data.url = url;
    }
    if (input.type !== undefined && FounderCardsService.BLOCK_TYPES.includes(input.type)) {
      data.type = input.type;
    }
    return prisma.cardBlock.update({ where: { id: blockId }, data });
  }

  async deleteBlock(userId: string, blockId: string): Promise<void> {
    const block = await prisma.cardBlock.findUnique({ where: { id: blockId } });
    if (!block || block.userId !== userId) throw new NotFoundError('Block');
    await prisma.cardBlock.delete({ where: { id: blockId } });
  }

  // ── Card lead capture ("leave your details") ──────────────────────────────

  /** Anonymous visitor leaves contact details on someone's public card. */
  async captureLead(ownerId: string, input: { name: string; email: string; message?: string }) {
    const name = input.name?.trim();
    const email = input.email?.trim();
    if (!name) throw new BadRequestError('Name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('A valid email is required');
    }

    const owner = await prisma.user.findFirst({
      where: { id: ownerId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!owner) throw new NotFoundError('User');

    const lead = await prisma.cardLead.create({
      data: {
        ownerId,
        name: name.slice(0, 120),
        email: email.slice(0, 160),
        message: input.message?.trim().slice(0, 1000) || null,
      },
    });

    notificationsService
      .createNotification(
        ownerId,
        'SYSTEM',
        'New lead from your card',
        `${name} left their details on your Tap Card.`,
        { leadId: lead.id, email }
      )
      .catch(() => {});

    return { ok: true };
  }

  /** Owner lists leads captured from their card. */
  async listLeads(ownerId: string) {
    return prisma.cardLead.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async generateQR(userId: string) {
    const card = await prisma.founderCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'ACTIVE') {
      throw new BadRequestError('Only active Founder Cards can generate QR codes');
    }

    const qrPayload = Buffer.from(
      JSON.stringify({
        userId,
        type: 'founder_card',
        timestamp: Date.now(),
      })
    ).toString('base64');

    const qrCode = await generateQRCode(qrPayload);

    const updatedCard = await prisma.founderCard.update({
      where: { userId },
      data: {
        qrCode,
        qrCodeUrl: qrCode, // In production, this would be an S3 URL
      },
    });

    return updatedCard;
  }

  async approveCard(cardId: string, adminId: string) {
    const card = await prisma.founderCard.findUnique({
      where: { id: cardId },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'PENDING') {
      throw new BadRequestError('Only pending cards can be approved');
    }

    const qrPayload = Buffer.from(
      JSON.stringify({
        userId: card.userId,
        type: 'founder_card',
        timestamp: Date.now(),
      })
    ).toString('base64');

    const qrCode = await generateQRCode(qrPayload);

    const updatedCard = await prisma.founderCard.update({
      where: { id: cardId },
      data: {
        status: 'ACTIVE',
        qrCode,
        qrCodeUrl: qrCode,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Update user tier to FOUNDER
    await prisma.user.update({
      where: { id: card.userId },
      data: { tier: 'FOUNDER' },
    });

    // Add FK score
    await gamificationService
      .addScore(card.userId, 'FOUNDER_CARD_ACTIVE', SCORE_VALUES.FOUNDER_CARD_ACTIVE, { cardId })
      .catch(() => {});

    // Send notification
    await notificationsService
      .createNotification(
        card.userId,
        'FOUNDER_CARD_APPROVED',
        'Founder Card Approved!',
        'Congratulations! Your Founder Card application has been approved.',
        { cardId }
      )
      .catch(() => {});

    // Send email
    if (card.user) {
      const name = card.user.profile
        ? `${card.user.profile.firstName} ${card.user.profile.lastName}`
        : card.user.email;

      sendEmail(
        card.user.email,
        'Your Founder Card is Approved! - TapByWisein',
        founderCardApprovedEmail(name)
      ).catch(() => {});
    }

    return updatedCard;
  }

  async rejectCard(cardId: string, adminId: string, reason?: string) {
    const card = await prisma.founderCard.findUnique({
      where: { id: cardId },
      include: { user: true },
    });

    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'PENDING') {
      throw new BadRequestError('Only pending cards can be rejected');
    }

    const updatedCard = await prisma.founderCard.update({
      where: { id: cardId },
      data: {
        status: 'REJECTED',
        reason: reason ?? null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    // Notify user
    await notificationsService
      .createNotification(
        card.userId,
        'FOUNDER_CARD_REJECTED',
        'Founder Card Application Update',
        reason
          ? `Your Founder Card application was not approved: ${reason}`
          : 'Your Founder Card application was not approved at this time.',
        { cardId }
      )
      .catch(() => {});

    return updatedCard;
  }

  async deactivateCard(cardId: string, adminId: string) {
    const card = await prisma.founderCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'ACTIVE') {
      throw new BadRequestError('Only active cards can be deactivated');
    }

    return prisma.founderCard.update({
      where: { id: cardId },
      data: {
        status: 'DEACTIVATED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });
  }

  async reactivateCard(cardId: string, adminId: string) {
    const card = await prisma.founderCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'DEACTIVATED') {
      throw new BadRequestError('Only deactivated cards can be reactivated');
    }

    return prisma.founderCard.update({
      where: { id: cardId },
      data: {
        status: 'ACTIVE',
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });
  }

  async listPendingCards(page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    // "Pending" = paid for a physical card but not yet provisioned (no nfcTagId)
    const paidUserIds = await prisma.cardPurchase.findMany({
      where: { status: 'PAID' },
      select: { userId: true },
    });
    const userIds = paidUserIds.map((p) => p.userId);

    const [cards, total] = await Promise.all([
      prisma.founderCard.findMany({
        where: { userId: { in: userIds }, nfcTagId: null },
        include: {
          user: {
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
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { appliedAt: 'asc' },
      }),
      prisma.founderCard.count({ where: { userId: { in: userIds }, nfcTagId: null } }),
    ]);

    return {
      cards,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getCardByQR(qrData: string) {
    let parsedData: { userId: string; type: string };

    try {
      parsedData = JSON.parse(Buffer.from(qrData, 'base64').toString('utf-8')) as {
        userId: string;
        type: string;
      };
    } catch {
      throw new BadRequestError('Invalid QR code data');
    }

    const { userId } = parsedData;

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
      include: {
        profile: true,
        founderCard: {
          select: { id: true, status: true, appliedAt: true },
        },
        gamification: { select: { fkScore: true, level: true } },
      },
    });

    if (!user) throw new NotFoundError('User');
    if (user.founderCard?.status !== 'ACTIVE') {
      throw new BadRequestError('This QR code does not belong to an active Founder Card');
    }

    const { password: _pw, ...safeUser } = user;
    void _pw;
    return safeUser;
  }

  /**
   * Public card view by short slug — used by /c/:slug and /card/:userId.
   * Returns only fields safe to display to anyone who scans the QR/NFC.
   * Auto-heals legacy cards missing a slug by writing it on the fly.
   */
  async getPublicCardBySlug(slug: string, viewerId?: string) {
    const card = await prisma.founderCard.findUnique({
      where: { publicSlug: slug },
      include: {
        user: {
          include: {
            profile: true,
            gamification: { select: { fkScore: true, level: true } },
          },
        },
      },
    });

    if (!card || !card.user || !card.user.isActive || card.user.deletedAt) {
      throw new NotFoundError('Founder Card');
    }

    if (viewerId && viewerId !== card.userId) {
      const blocksService = (await import('@modules/blocks/blocks.service')).default;
      if (await blocksService.isBlocked(viewerId, card.userId)) {
        throw new NotFoundError('Founder Card');
      }
    }

    void this.notifyCardViewed(card.userId, viewerId);
    void this.recordCardView(card.userId, viewerId);
    const [blocks, contactUnlocked, organizerStats] = await Promise.all([
      this.listBlocks(card.userId),
      this.canSeeContact(card.userId, viewerId),
      this.organizerStats(card.userId),
    ]);
    return { ...this.publicCardShape(card, contactUnlocked), blocks, organizerStats };
  }

  async getPublicCardByUsername(rawUsername: string, viewerId?: string) {
    const username = rawUsername.trim().toLowerCase();
    if (!username) throw new NotFoundError('User');
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundError('User');
    return this.getPublicCardByUserId(user.id, viewerId);
  }

  async getPublicCardByUserId(userId: string, viewerId?: string) {
    // Look up the user first — the public card page should render for ANY
    // active user, even those without a FounderCard. Card status appears as
    // an extra chip when present, never as a gate.
    const user = await prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      include: {
        profile: true,
        gamification: { select: { fkScore: true, level: true } },
      },
    });
    if (!user) throw new NotFoundError('User');

    // A blocked viewer must not be able to pull up the card.
    if (viewerId && viewerId !== user.id) {
      const blocksService = (await import('@modules/blocks/blocks.service')).default;
      if (await blocksService.isBlocked(viewerId, user.id)) {
        throw new NotFoundError('Founder Card');
      }
    }

    void this.notifyCardViewed(user.id, viewerId);
    void this.recordCardView(user.id, viewerId);

    let card = await prisma.founderCard.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            profile: true,
            gamification: { select: { fkScore: true, level: true } },
          },
        },
      },
    });

    // Lazily mint the slug once the card exists but never had one.
    if (card && !card.publicSlug) {
      const slug = cardIdToSlug(card.id);
      card = await prisma.founderCard.update({
        where: { id: card.id },
        data: { publicSlug: slug },
        include: {
          user: {
            include: {
              profile: true,
              gamification: { select: { fkScore: true, level: true } },
            },
          },
        },
      });
    }

    const [blocks, contactUnlocked, organizerStats] = await Promise.all([
      this.listBlocks(user.id),
      this.canSeeContact(user.id, viewerId),
      this.organizerStats(user.id),
    ]);
    if (card) return { ...this.publicCardShape(card, contactUnlocked), blocks, organizerStats };

    // No FounderCard row — return a card-shaped envelope built from the user
    // alone so the public page can still render their profile. Goes through
    // publicCardShape so the same field whitelist + contact gate apply.
    return {
      ...this.publicCardShape(
        {
          id: '',
          userId: user.id,
          status: 'NO_CARD',
          memberId: null,
          publicSlug: null,
          qrCodeUrl: null,
          user: {
            id: user.id,
            email: user.email,
            profile: user.profile as Record<string, unknown> | null,
            gamification: user.gamification,
          },
        },
        contactUnlocked
      ),
      blocks,
      organizerStats,
    };
  }

  /**
   * Host trust signals for the public card — ratings + history the platform
   * already collects. Null when the user has never hosted a published event,
   * so attendee cards are unaffected.
   */
  private async organizerStats(userId: string) {
    const hostedWhere = {
      organizerId: userId,
      deletedAt: null,
      status: { in: ['PUBLISHED', 'COMPLETED'] as ('PUBLISHED' | 'COMPLETED')[] },
    };
    const [eventsHosted, ratingAgg, totalAttendees, upcomingEvents] = await Promise.all([
      prisma.event.count({ where: hostedWhere }),
      prisma.eventFeedback.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
        where: { event: { organizerId: userId, deletedAt: null } },
      }),
      prisma.eventRegistration.count({
        where: { status: { not: 'CANCELLED' }, event: hostedWhere },
      }),
      prisma.event.findMany({
        where: {
          organizerId: userId,
          deletedAt: null,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          startDate: { gte: new Date() },
        },
        orderBy: { startDate: 'asc' },
        take: 3,
        select: { id: true, title: true, startDate: true, city: true, locationType: true },
      }),
    ]);
    if (eventsHosted === 0) return null;
    return {
      eventsHosted,
      totalAttendees,
      avgRating:
        ratingAgg._avg.rating != null ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      ratingCount: ratingAgg._count.rating,
      upcomingEvents,
    };
  }

  /** True when the two users share an ACCEPTED connection. */
  private async isAcceptedConnection(a: string, b: string): Promise<boolean> {
    const row = await prisma.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: a, receiverId: b },
          { requesterId: b, receiverId: a },
        ],
      },
      select: { id: true },
    });
    return !!row;
  }

  /** Contact details are visible only to the owner and accepted connections. */
  private async canSeeContact(ownerId: string, viewerId?: string): Promise<boolean> {
    if (!viewerId) return false;
    if (viewerId === ownerId) return true;
    return this.isAcceptedConnection(viewerId, ownerId);
  }

  private publicCardShape(
    card: {
      id: string;
      userId: string;
      status: string;
      memberId: string | null;
      publicSlug: string | null;
      qrCodeUrl: string | null;
      user: {
        id: string;
        email: string;
        profile: Record<string, unknown> | null;
        gamification: { fkScore: number; level: number } | null;
      };
    },
    contactUnlocked: boolean
  ) {
    // Whitelist explicitly — the Prisma profile row also carries phone and
    // payout/bank fields that must NEVER reach this public endpoint.
    const p = card.user.profile;
    const profile = p
      ? {
          firstName: p.firstName,
          lastName: p.lastName,
          avatar: p.avatar,
          company: p.company,
          position: p.position,
          bio: p.bio,
          status: p.status,
          location: p.location,
          twitter: p.twitter,
          linkedin: p.linkedin,
          website: p.website,
          instagram: p.instagram,
          skills: p.skills,
          interests: p.interests,
          lookingFor: p.lookingFor,
          // Contact info unlocks by connecting — the growth loop.
          phone: contactUnlocked ? p.phone : null,
          email: contactUnlocked ? p.email : null,
        }
      : null;
    return {
      id: card.id,
      userId: card.userId,
      status: card.status,
      memberId: card.memberId,
      slug: card.publicSlug,
      qrCodeUrl: card.qrCodeUrl,
      contactUnlocked,
      user: {
        id: card.user.id,
        email: contactUnlocked ? card.user.email : null,
        profile,
        gamification: card.user.gamification,
      },
    };
  }

  /**
   * Bind a physical NFC sticker tag id to the user's card.
   * Idempotent: writing the same tag id twice is a no-op.
   */
  async provisionNfc(userId: string, nfcTagId: string) {
    const trimmed = nfcTagId.trim();
    if (!trimmed) throw new BadRequestError('NFC tag id is required');

    const card = await prisma.founderCard.findUnique({ where: { userId } });
    if (!card) throw new NotFoundError('Founder Card');
    if (card.status !== 'ACTIVE') {
      throw new BadRequestError('Only active Founder Cards can be linked to an NFC tag');
    }

    const collision = await prisma.founderCard.findUnique({ where: { nfcTagId: trimmed } });
    if (collision && collision.id !== card.id) {
      throw new ConflictError('This NFC tag is already linked to another card');
    }

    return prisma.founderCard.update({
      where: { userId },
      data: { nfcTagId: trimmed },
    });
  }

  async provisionNfcByCardId(cardId: string, nfcTagId: string) {
    const trimmed = nfcTagId.trim();
    if (!trimmed) throw new BadRequestError('NFC tag id is required');

    const card = await prisma.founderCard.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundError('Founder Card');

    const collision = await prisma.founderCard.findUnique({ where: { nfcTagId: trimmed } });
    if (collision && collision.id !== card.id) {
      throw new ConflictError('This NFC tag is already linked to another card');
    }

    return prisma.founderCard.update({
      where: { id: cardId },
      data: { nfcTagId: trimmed, status: 'ACTIVE', reviewedAt: new Date() },
    });
  }

  async getAllCards(page?: number, limit?: number, status?: string) {
    const pagination = parsePaginationQuery({ page, limit });
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [cards, total] = await Promise.all([
      prisma.founderCard.findMany({
        where,
        include: {
          user: {
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
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.founderCard.count({ where }),
    ]);

    return {
      cards,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /**
   * The card as a downloadable .vcf contact ("Save contact"). Phone/email are
   * included only for the owner and accepted connections — everyone else gets
   * a contact card without direct-reach details (same gate as the card page).
   */
  async getVCardBySlug(slug: string, viewerId?: string): Promise<string> {
    const card = await prisma.founderCard.findUnique({
      where: { publicSlug: slug },
      include: { user: { include: { profile: true } } },
    });
    if (!card || !card.user || !card.user.isActive || card.user.deletedAt || !card.user.profile) {
      throw new NotFoundError('Founder Card');
    }
    const contactUnlocked = await this.canSeeContact(card.userId, viewerId);
    const p = card.user.profile;
    return buildVCard({
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      position: p.position,
      phone: contactUnlocked ? p.phone : null,
      email: contactUnlocked ? p.email : null,
      website: p.website,
      linkedin: p.linkedin,
      twitter: p.twitter,
      instagram: p.instagram,
      bio: p.bio?.slice(0, 500),
      avatarUrl: p.avatar,
      cardUrl: `${env.FRONTEND_URL}/c/${slug}`,
    });
  }
}

export default new FounderCardsService();
