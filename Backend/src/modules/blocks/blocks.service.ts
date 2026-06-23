import prisma from '@config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '@utils/errors';

/**
 * User block list. A block is one-directional in storage but enforced
 * bidirectionally: if A blocks B, neither can message or connect with the other.
 */
export class BlocksService {
  /** True when a block exists in EITHER direction between two users. */
  async isBlocked(a: string, b: string): Promise<boolean> {
    if (a === b) return false;
    const row = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async assertNotBlocked(
    a: string,
    b: string,
    message = 'This action is unavailable with this user'
  ): Promise<void> {
    if (await this.isBlocked(a, b)) throw new ForbiddenError(message);
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new BadRequestError("You can't block yourself");
    const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
    if (!target) throw new NotFoundError('User');

    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });

    // Sever any existing connection (either direction) so they leave each
    // other's network immediately.
    await prisma.connection.deleteMany({
      where: {
        OR: [
          { requesterId: blockerId, receiverId: blockedId },
          { requesterId: blockedId, receiverId: blockerId },
        ],
      },
    });

    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await prisma.blockedUser.deleteMany({ where: { blockerId, blockedId } });
    return { blocked: false };
  }

  async listBlocks(blockerId: string) {
    const rows = await prisma.blockedUser.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, avatar: true } },
          },
        },
      },
    });
    return rows.map((r) => ({ id: r.blockedId, blockedAt: r.createdAt, user: r.blocked }));
  }
}

export default new BlocksService();
