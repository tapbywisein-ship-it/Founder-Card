import prisma from '@config/database';
import { NotFoundError, BadRequestError, ConflictError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { processAvatar } from '@middlewares/upload';
import { PaginationQuery } from '@appTypes/index';
import { UpdateProfileDto, SearchUsersDto } from './users.validation';
import mediaService from '@modules/media/media.service';
import gamificationService from '@modules/gamification/gamification.service';
import logger from '@utils/logger';
import { SCORE_VALUES } from '@config/constants';

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'card',
  'c',
  'e',
  'auth',
  'login',
  'logout',
  'register',
  'org',
  'organizer',
  'organizers',
  'attendee',
  'event',
  'events',
  'me',
  'profile',
  'dashboard',
  'settings',
  'support',
  'help',
  'static',
  'public',
  'www',
  'app',
  'tapbywisein',
  'tap',
  'wisein',
]);

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function validateUsernameFormat(u: string): string | null {
  if (!u) return 'Username is required';
  if (u.length < 3) return 'Username must be at least 3 characters';
  if (u.length > 30) return 'Username must be 30 characters or fewer';
  if (!USERNAME_RE.test(u)) return 'Use lowercase letters, numbers, hyphens or underscores';
  if (RESERVED_USERNAMES.has(u)) return 'That username is reserved';
  return null;
}

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        gamification: true,
        founderCard: {
          select: {
            id: true,
            status: true,
            qrCodeUrl: true,
          },
        },
        _count: {
          select: {
            sentConnections: { where: { status: 'ACCEPTED' } },
            receivedConnections: { where: { status: 'ACCEPTED' } },
            registrations: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tier: user.tier,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      profile: user.profile,
      gamification: user.gamification,
      founderCard: user.founderCard,
      stats: {
        connections: user._count.sentConnections + user._count.receivedConnections,
        eventsRegistered: user._count.registrations,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true },
    });

    if (!user) throw new NotFoundError('User');

    const {
      socialLinks,
      firstName,
      lastName,
      twitter,
      linkedin,
      website,
      instagram,
      ...profileFields
    } = dto;

    const updateData: Record<string, unknown> = { ...profileFields };

    // Empty status clears the live status line.
    if (updateData.status === '') updateData.status = null;

    // Empty pitch-spotlight fields clear their column.
    for (const k of ['pitchName', 'pitchTagline', 'pitchStage', 'pitchUrl'] as const) {
      if (updateData[k] === '') updateData[k] = null;
    }

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    // Accept flat social fields (sent by the profile editor) and nested
    // socialLinks (kept for backward-compat). Flat fields take precedence.
    const resolvedTwitter = twitter ?? socialLinks?.twitter;
    const resolvedLinkedin = linkedin ?? socialLinks?.linkedin;
    const resolvedWebsite = website ?? socialLinks?.website;
    const resolvedInstagram = instagram ?? socialLinks?.instagram;

    if (resolvedTwitter !== undefined) updateData.twitter = resolvedTwitter || null;
    if (resolvedLinkedin !== undefined) updateData.linkedin = resolvedLinkedin || null;
    if (resolvedWebsite !== undefined) updateData.website = resolvedWebsite || null;
    if (resolvedInstagram !== undefined) updateData.instagram = resolvedInstagram || null;

    const prevProfile = user.profile;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        firstName: firstName ?? 'User',
        lastName: lastName ?? '',
        ...profileFields,
        twitter: resolvedTwitter || null,
        linkedin: resolvedLinkedin || null,
        website: resolvedWebsite || null,
        instagram: resolvedInstagram || null,
      },
    });

    // Award PROFILE_PHOTO_ADDED once when avatar is first set
    const newAvatar = (updateData.avatar as string | undefined) ?? profile.avatar;
    if (!prevProfile?.avatar && newAvatar) {
      gamificationService
        .addScore(userId, 'PROFILE_PHOTO_ADDED', SCORE_VALUES.PROFILE_PHOTO_ADDED)
        .catch((err) => logger.warn('Failed to award PROFILE_PHOTO_ADDED score', { userId, err }));
    }

    // Award PROFILE_COMPLETE (50pts) once when all core fields are filled
    const isComplete =
      !!profile.firstName &&
      !!profile.lastName &&
      !!profile.bio &&
      !!profile.avatar &&
      (profile.skills?.length ?? 0) > 0;
    if (isComplete) {
      const alreadyAwarded = await prisma.scoreHistory.findFirst({
        where: { userId, action: 'PROFILE_COMPLETE' },
      });
      if (!alreadyAwarded) {
        gamificationService
          .addScore(userId, 'PROFILE_COMPLETE', SCORE_VALUES.PROFILE_COMPLETE)
          .catch((err) => logger.warn('Failed to award PROFILE_COMPLETE score', { userId, err }));
      }
    }

    return profile;
  }

  /** Update the organizer's payout account (UPI / bank) used for manual settlements. */
  async updatePayoutAccount(
    userId: string,
    dto: {
      payoutUpiId?: string;
      payoutAccountName?: string;
      payoutBankName?: string;
      payoutAccountNumber?: string;
      payoutIfsc?: string;
    }
  ) {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Profile');
    const data: Record<string, unknown> = {};
    (
      [
        'payoutUpiId',
        'payoutAccountName',
        'payoutBankName',
        'payoutAccountNumber',
        'payoutIfsc',
      ] as const
    ).forEach((k) => {
      if (dto[k] !== undefined) data[k] = dto[k] || null;
    });
    return prisma.profile.update({ where: { userId }, data });
  }

  async updateAvatar(
    userId: string,
    fileBuffer: Buffer,
    _mimeType: string
  ): Promise<{ avatarUrl: string }> {
    const processedBuffer = await processAvatar(fileBuffer);
    const filename = `avatars/${userId}-${Date.now()}.jpg`;

    const avatarUrl = await mediaService.uploadFile(processedBuffer, filename, 'image/jpeg');

    const prev = await prisma.profile.findUnique({ where: { userId }, select: { avatar: true } });
    await prisma.profile.update({ where: { userId }, data: { avatar: avatarUrl } });

    if (!prev?.avatar) {
      gamificationService
        .addScore(userId, 'PROFILE_PHOTO_ADDED', SCORE_VALUES.PROFILE_PHOTO_ADDED)
        .catch((err) => logger.warn('Failed to award PROFILE_PHOTO_ADDED score', { userId, err }));
    }

    return { avatarUrl };
  }

  async deleteAvatar(userId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Profile');

    if (profile.avatar) {
      try {
        await mediaService.deleteFile(profile.avatar);
      } catch {
        // Ignore deletion errors
      }
    }

    await prisma.profile.update({
      where: { userId },
      data: { avatar: null },
    });
  }

  async searchUsers(dto: SearchUsersDto, currentUserId: string) {
    const pagination = parsePaginationQuery({
      page: dto.page,
      limit: dto.limit,
    });

    const where: Record<string, unknown> = {
      deletedAt: null,
      isActive: true,
      id: { not: currentUserId },
    };

    if (dto.q) {
      where.profile = {
        OR: [
          { firstName: { contains: dto.q, mode: 'insensitive' } },
          { lastName: { contains: dto.q, mode: 'insensitive' } },
          { company: { contains: dto.q, mode: 'insensitive' } },
        ],
      };
    }

    if (dto.role) {
      where.role = dto.role;
    }

    if (dto.skills) {
      const skillList = dto.skills.split(',').map((s) => s.trim());
      where.profile = {
        ...((where.profile as object) ?? {}),
        skills: { hasSome: skillList },
      };
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
              skills: true,
              location: true,
            },
          },
          gamification: {
            select: { fkScore: true, level: true },
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

  async getUserById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null, isActive: true },
      include: {
        profile: true,
        gamification: {
          select: { fkScore: true, level: true },
        },
        founderCard: {
          select: { status: true },
        },
      },
    });

    if (!user) throw new NotFoundError('User');

    // Return public profile (excluding sensitive data)
    const { password: _pw, ...publicUser } = user;
    void _pw;
    return publicUser;
  }

  async getUserStats(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) throw new NotFoundError('User');

    const [connectionCount, eventsAttended, gamification, badgeCount] = await Promise.all([
      prisma.connection.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
      }),
      prisma.eventRegistration.count({
        where: { userId, status: { in: ['REGISTERED', 'ATTENDED'] } },
      }),
      prisma.gamification.findUnique({
        where: { userId },
        select: { fkScore: true, level: true },
      }),
      prisma.userBadge.count({ where: { userId } }),
    ]);

    return {
      connections: connectionCount,
      eventsAttended,
      fkScore: gamification?.fkScore ?? 0,
      level: gamification?.level ?? 1,
      badges: badgeCount,
    };
  }

  async listUsers(pagination: PaginationQuery) {
    const parsed = parsePaginationQuery(pagination);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
              company: true,
            },
          },
        },
        skip: parsed.skip,
        take: parsed.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      users,
      pagination: buildPaginationMeta(total, parsed.page, parsed.limit),
    };
  }

  async checkUsernameAvailable(rawUsername: string, requesterId?: string) {
    const u = normalizeUsername(rawUsername);
    const reason = validateUsernameFormat(u);
    if (reason) return { available: false, reason };

    const existing = await prisma.user.findUnique({
      where: { username: u },
      select: { id: true },
    });

    if (existing && existing.id !== requesterId) {
      return { available: false, reason: 'That username is taken' };
    }
    return { available: true };
  }

  /**
   * Self-service organizer upgrade. The product uses an open model: any
   * signed-in attendee can promote themselves to ORGANIZER on demand (no admin
   * approval). Admins keep their elevated role. `organization` is stored on the
   * profile when provided so the host has a company name on their events.
   */
  async requestOrganizerRole(userId: string, dto: { reason?: string; organization?: string }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true },
    });
    if (!user) throw new NotFoundError('User');
    if (user.role === 'ORGANIZER' || user.role === 'ADMIN') {
      throw new BadRequestError('You are already an organizer');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ORGANIZER' },
    });

    // Backfill company on the profile if they supplied one and it's empty.
    if (dto.organization && user.profile && !user.profile.company) {
      await prisma.profile
        .update({ where: { userId }, data: { company: dto.organization } })
        .catch((err) => logger.warn('Failed to set organizer company', { userId, err }));
    }

    logger.info('User self-upgraded to organizer', { userId, organization: dto.organization });
    return { ok: true, role: 'ORGANIZER' as const };
  }

  async claimUsername(userId: string, rawUsername: string) {
    const u = normalizeUsername(rawUsername);
    const reason = validateUsernameFormat(u);
    if (reason) throw new BadRequestError(reason);

    const existing = await prisma.user.findUnique({
      where: { username: u },
      select: { id: true },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictError('That username is taken');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username: u },
      select: { id: true, username: true },
    });
    return user;
  }
}

export default new UsersService();
