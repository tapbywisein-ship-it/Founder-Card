import prisma from '@config/database';
import { NotFoundError, BadRequestError, ConflictError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { processAvatar } from '@middlewares/upload';
import { PaginationQuery } from '@appTypes/index';
import { UpdateProfileDto, SearchUsersDto } from './users.validation';
import mediaService from '@modules/media/media.service';

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'card', 'c', 'e', 'auth', 'login', 'logout', 'register',
  'org', 'organizer', 'organizers', 'attendee', 'event', 'events',
  'me', 'profile', 'dashboard', 'settings', 'support', 'help',
  'static', 'public', 'www', 'app', 'founderkey', 'founder', 'founders',
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
        connections:
          user._count.sentConnections + user._count.receivedConnections,
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

    const { socialLinks, firstName, lastName, ...profileFields } = dto;

    const updateData: Record<string, unknown> = { ...profileFields };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    if (socialLinks) {
      if (socialLinks.twitter !== undefined) updateData.twitter = socialLinks.twitter || null;
      if (socialLinks.linkedin !== undefined) updateData.linkedin = socialLinks.linkedin || null;
      if (socialLinks.website !== undefined) updateData.website = socialLinks.website || null;
      if (socialLinks.instagram !== undefined) updateData.instagram = socialLinks.instagram || null;
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        firstName: firstName ?? 'User',
        lastName: lastName ?? '',
        ...profileFields,
        twitter: socialLinks?.twitter || null,
        linkedin: socialLinks?.linkedin || null,
        website: socialLinks?.website || null,
        instagram: socialLinks?.instagram || null,
      },
    });

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
    (['payoutUpiId', 'payoutAccountName', 'payoutBankName', 'payoutAccountNumber', 'payoutIfsc'] as const).forEach(
      (k) => {
        if (dto[k] !== undefined) data[k] = dto[k] || null;
      }
    );
    return prisma.profile.update({ where: { userId }, data });
  }

  async updateAvatar(
    userId: string,
    fileBuffer: Buffer,
    _mimeType: string
  ): Promise<{ avatarUrl: string }> {
    const processedBuffer = await processAvatar(fileBuffer);
    const filename = `avatars/${userId}-${Date.now()}.jpg`;

    let avatarUrl: string;

    try {
      avatarUrl = await mediaService.uploadFile(processedBuffer, filename, 'image/jpeg');
    } catch {
      avatarUrl = await mediaService.uploadLocal(processedBuffer, filename);
    }

    await prisma.profile.update({
      where: { userId },
      data: { avatar: avatarUrl },
    });

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
        ...(where.profile as object ?? {}),
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
