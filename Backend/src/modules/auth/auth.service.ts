import { createHash } from 'crypto';
import prisma from '@config/database';
import { env } from '@config/env';
import { generateToken, hashPassword } from '@utils/crypto';
import { NotFoundError, BadRequestError } from '@utils/errors';
import { AuthUser, AuthResponse } from './auth.types';

const userInclude = {
  profile: true,
  founderCard: { select: { id: true, status: true, qrCodeUrl: true, memberId: true } },
  gamification: { select: { fkScore: true, level: true } },
} as const;

function toAuthUser(user: Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>): AuthUser {
  const u = user as typeof user & {
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position?: string | null;
      bio?: string | null;
      location?: string | null;
      linkedin?: string | null;
      twitter?: string | null;
      website?: string | null;
      skills: string[];
      interests: string[];
      lookingFor: string[];
    } | null;
    founderCard: {
      id: string;
      status: string;
      qrCodeUrl: string | null;
      memberId: string | null;
    } | null;
    gamification: { fkScore: number; level: number } | null;
  };
  return {
    id: u.id,
    email: u.email,
    role: u.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
    tier: u.tier as 'FREE' | 'FOUNDER',
    isActive: u.isActive,
    isEmailVerified: u.isEmailVerified,
    username: u.username,
    profile: u.profile
      ? {
          firstName: u.profile.firstName,
          lastName: u.profile.lastName,
          avatar: u.profile.avatar,
          company: u.profile.company,
          position: u.profile.position ?? null,
          bio: u.profile.bio ?? null,
          location: u.profile.location ?? null,
          linkedin: u.profile.linkedin ?? null,
          twitter: u.profile.twitter ?? null,
          website: u.profile.website ?? null,
          skills: u.profile.skills,
          interests: u.profile.interests,
          lookingFor: u.profile.lookingFor,
        }
      : null,
    founderCard: u.founderCard
      ? {
          id: u.founderCard.id,
          status: u.founderCard.status,
          qrCodeUrl: u.founderCard.qrCodeUrl,
          memberId: u.founderCard.memberId,
        }
      : null,
    gamification: u.gamification
      ? { fkScore: u.gamification.fkScore, level: u.gamification.level }
      : null,
  };
}

export class AuthService {
  async getMe(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!user) throw new NotFoundError('User');
    return toAuthUser(user as Parameters<typeof toAuthUser>[0]);
  }

  // ─── Magic-link claim flow for CSV-imported invitees ──────────────────────

  async generateClaimToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const token = generateToken(32);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.claimToken.create({ data: { userId, tokenHash, expiresAt } });
    return `${env.FRONTEND_URL}/claim/${token}`;
  }

  async validateClaimToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await prisma.claimToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { profile: true } } },
    });
    if (!row) throw new NotFoundError('Claim token');
    if (row.usedAt) throw new BadRequestError('This invitation has already been claimed');
    if (row.expiresAt < new Date()) {
      throw new BadRequestError('This invitation has expired — ask your organizer to resend');
    }
    return {
      email: row.user.email,
      firstName: row.user.profile?.firstName ?? null,
      lastName: row.user.profile?.lastName ?? null,
    };
  }

  async claimAccount(token: string, password: string): Promise<AuthResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = await prisma.claimToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { ...userInclude } } },
    });
    if (!row) throw new NotFoundError('Claim token');
    if (row.usedAt) throw new BadRequestError('This invitation has already been claimed');
    if (row.expiresAt < new Date()) throw new BadRequestError('This invitation has expired');
    if (password.length < 8) throw new BadRequestError('Password must be at least 8 characters');

    const hashed = await hashPassword(password);

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { password: hashed, isEmailVerified: true, authProvider: 'email' },
        include: userInclude,
      }),
      prisma.claimToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      // Init gamification inside the same transaction so account creation is
      // never left in a half-built state if the DB call after the tx fails.
      ...(row.user.gamification
        ? []
        : [prisma.gamification.create({ data: { userId: row.userId, fkScore: 0, level: 1 } })]),
    ]);

    return { user: toAuthUser(user as Parameters<typeof toAuthUser>[0]), tokens: null };
  }
}

export default new AuthService();
