import { Router, Request, Response } from 'express';
import { authenticate } from '@middlewares/authenticate';
import prisma from '@config/database';
import { sendSuccess } from '@utils/response';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const q = ((req.query.q as string) ?? '').trim();
  const currentUserId = req.user!.userId;

  if (!q || q.length < 2) {
    sendSuccess(res, { users: [], events: [] });
    return;
  }

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        id: { not: currentUserId },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { profile: { firstName: { contains: q, mode: 'insensitive' } } },
          { profile: { lastName: { contains: q, mode: 'insensitive' } } },
          { profile: { company: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        username: true,
        role: true,
        profile: { select: { firstName: true, lastName: true, avatar: true, company: true } },
      },
      take: 6,
    }),
    prisma.event.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        startDate: true,
        coverImage: true,
        city: true,
        address: true,
      },
      take: 6,
    }),
  ]);

  sendSuccess(res, { users, events });
});

export default router;
