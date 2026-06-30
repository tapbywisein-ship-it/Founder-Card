import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '@config/supabase';
import prisma from '@config/database';
import { UnauthorizedError } from '@utils/errors';
import logger from '@utils/logger';
import gamificationService from '@modules/gamification/gamification.service';
import { SCORE_VALUES } from '@config/constants';

async function resolveUser(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const supabaseUser = data.user;
  const email = supabaseUser.email;
  if (!email) throw new UnauthorizedError('Token has no email');

  const include = {
    profile: true,
    founderCard: { select: { id: true, status: true, qrCodeUrl: true, memberId: true } },
    gamification: { select: { fkScore: true, level: true } },
  } as const;

  // Try supabaseId first, then fall back to email
  let user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id }, include });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email }, include });

    if (user) {
      // Link supabaseId on first login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseId: supabaseUser.id,
          isEmailVerified: true,
          authProvider: supabaseUser.app_metadata?.provider ?? user.authProvider,
        },
        include,
      });
      // Award first-login bonus now that we've linked the account
      gamificationService
        .addScore(user.id, 'FIRST_LOGIN', SCORE_VALUES.FIRST_LOGIN)
        .catch((err) =>
          logger.warn('Failed to award FIRST_LOGIN score', { userId: user!.id, err })
        );
    } else {
      // Auto-create user from Supabase profile (Google OAuth new user)
      const meta = supabaseUser.user_metadata ?? {};
      const fullName: string = meta.full_name ?? meta.name ?? '';
      const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = meta.given_name ?? nameParts[0] ?? 'User';
      const rawLast = meta.family_name ?? nameParts.slice(1).join(' ') ?? '';
      // Prevent duplicate: if family_name === given_name (some Google accounts), drop it
      const lastName = rawLast === firstName ? '' : rawLast;
      const avatar: string | undefined = meta.avatar_url ?? meta.picture;

      const requestedRole = (supabaseUser.user_metadata?.signup_role as string | undefined)?.toUpperCase();
      const initialRole = requestedRole === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE';

      user = await prisma.user.create({
        data: {
          email,
          supabaseId: supabaseUser.id,
          googleId: supabaseUser.app_metadata?.provider === 'google' ? supabaseUser.id : undefined,
          authProvider: supabaseUser.app_metadata?.provider ?? 'email',
          password: null,
          isEmailVerified: true,
          role: initialRole,
          profile: {
            create: { firstName, lastName, avatar: avatar ?? null },
          },
          gamification: { create: { fkScore: 0, level: 1 } },
        },
        include,
      });

      logger.info('Auto-created user from Supabase auth', { userId: user.id, email });
      // Award first-login bonus for brand-new OAuth users
      gamificationService
        .addScore(user.id, 'FIRST_LOGIN', SCORE_VALUES.FIRST_LOGIN)
        .catch((err) =>
          logger.warn('Failed to award FIRST_LOGIN score', { userId: user!.id, err })
        );
    }
  }

  if (!user.isActive || user.deletedAt) {
    throw new UnauthorizedError('Account is deactivated');
  }

  return user;
}

export const authenticate = (_req: Request, _res: Response, next: NextFunction): void => {
  const req = _req;
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && 'accessToken' in req.cookies) {
    token = req.cookies.accessToken as string;
  }

  if (!token) {
    throw new UnauthorizedError('Authentication token is required');
  }

  resolveUser(token)
    .then((user) => {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
        tier: user.tier as 'FREE' | 'FOUNDER',
      };
      next();
    })
    .catch(next);
};

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && 'accessToken' in req.cookies) {
    token = req.cookies.accessToken as string;
  }

  if (!token) {
    next();
    return;
  }

  resolveUser(token)
    .then((user) => {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
        tier: user.tier as 'FREE' | 'FOUNDER',
      };
      next();
    })
    .catch(() => next());
};
