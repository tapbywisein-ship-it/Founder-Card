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
        : user?.email ?? 'A user';

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

  /** Mint the next human-readable member ID: FK-00001, FK-00002, … */
  private async generateMemberId(): Promise<string> {
    const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('founder_member_seq') AS nextval`;
    const n = Number(rows[0]?.nextval ?? 0);
    return `FK-${String(n).padStart(5, '0')}`;
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

    let card = await prisma.founderCard.findUnique({ where: { userId } });
    if (!card) {
      card = await prisma.founderCard.create({
        data: { userId, status: 'ACTIVE', reviewedAt: new Date() },
      });
    }

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
        .addScore(userId, 'FOUNDER_CARD_ACTIVE', SCORE_VALUES.FOUNDER_CARD_ACTIVE, { cardId: card.id })
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
    return card;
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
        'Your Founder Card is Approved! - Founder Key',
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

    const [cards, total] = await Promise.all([
      prisma.founderCard.findMany({
        where: { status: 'PENDING' },
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
      prisma.founderCard.count({ where: { status: 'PENDING' } }),
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
    return this.publicCardShape(card);
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

    if (card) return this.publicCardShape(card);

    // No FounderCard row — return a card-shaped envelope built from the user
    // alone so the public page can still render their profile.
    return {
      id: '',
      userId: user.id,
      status: 'NO_CARD',
      memberId: null,
      slug: null,
      qrCodeUrl: null,
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
        gamification: user.gamification,
      },
    };
  }

  private publicCardShape(card: {
    id: string;
    userId: string;
    status: string;
    memberId: string | null;
    publicSlug: string | null;
    qrCodeUrl: string | null;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        avatar: string | null;
        company: string | null;
        position: string | null;
        bio: string | null;
        location: string | null;
        twitter: string | null;
        linkedin: string | null;
        website: string | null;
        instagram: string | null;
        skills: string[];
        interests: string[];
        lookingFor: string[];
      } | null;
      gamification: { fkScore: number; level: number } | null;
    };
  }) {
    return {
      id: card.id,
      userId: card.userId,
      status: card.status,
      memberId: card.memberId,
      slug: card.publicSlug,
      qrCodeUrl: card.qrCodeUrl,
      user: {
        id: card.user.id,
        email: card.user.email,
        profile: card.user.profile,
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
                select: { firstName: true, lastName: true, avatar: true, company: true, position: true },
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
}

export default new FounderCardsService();
