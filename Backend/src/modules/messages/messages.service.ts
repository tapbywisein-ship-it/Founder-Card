import prisma from '@config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import notificationsService from '@modules/notifications/notifications.service';
import blocksService from '@modules/blocks/blocks.service';

const MAX_BODY = 4000;

/** Sort two ids so we always have a canonical (A, B) ordering for the unique pair index. */
const sortPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export class MessagesService {
  /**
   * Find or create the conversation between two users. Both must have an
   * ACCEPTED connection — messaging is gated by the network graph, not open.
   */
  async getOrCreateConversation(senderId: string, targetUserId: string) {
    if (senderId === targetUserId) {
      throw new BadRequestError("You can't message yourself");
    }

    await blocksService.assertNotBlocked(senderId, targetUserId, 'You cannot message this user');

    const connection = await prisma.connection.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: senderId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: senderId },
        ],
      },
      select: { id: true },
    });
    if (!connection) {
      throw new ForbiddenError('You can only message people you are connected with');
    }

    const [aId, bId] = sortPair(senderId, targetUserId);
    return prisma.conversation.upsert({
      where: { userAId_userBId: { userAId: aId, userBId: bId } },
      create: { userAId: aId, userBId: bId },
      update: {},
    });
  }

  /** Paginated list of conversations the user is part of, with last message. */
  async listConversations(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const [convos, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
        include: {
          userA: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true, position: true },
              },
            },
          },
          userB: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true, position: true },
              },
            },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.conversation.count({
        where: { OR: [{ userAId: userId }, { userBId: userId }] },
      }),
    ]);

    // Compute unread counts in one round trip.
    const ids = convos.map((c) => c.id);
    const unreadGroups =
      ids.length === 0
        ? []
        : await prisma.message.groupBy({
            by: ['conversationId'],
            where: {
              conversationId: { in: ids },
              senderId: { not: userId },
              readAt: null,
            },
            _count: { _all: true },
          });
    const unreadByConvo = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]));

    const items = convos.map((c) => {
      const other = c.userAId === userId ? c.userB : c.userA;
      const last = c.messages[0];
      return {
        id: c.id,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadByConvo.get(c.id) ?? 0,
        lastMessage: last
          ? {
              id: last.id,
              body: last.body,
              senderId: last.senderId,
              createdAt: last.createdAt,
              isMine: last.senderId === userId,
            }
          : null,
        otherUser: {
          id: other.id,
          email: other.email,
          profile: other.profile,
        },
      };
    });

    return {
      conversations: items,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async listMessages(conversationId: string, userId: string, page?: number, limit?: number) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!convo) throw new NotFoundError('Conversation');
    if (convo.userAId !== userId && convo.userBId !== userId) {
      throw new ForbiddenError('You are not part of this conversation');
    }

    const pagination = parsePaginationQuery({ page, limit });
    const [rows, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Reverse so the client gets oldest → newest in display order.
    return {
      messages: rows.reverse(),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async sendMessage(conversationId: string, senderId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestError('Message body is required');
    if (trimmed.length > MAX_BODY) {
      throw new BadRequestError(`Message too long (max ${MAX_BODY} chars)`);
    }

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!convo) throw new NotFoundError('Conversation');
    if (convo.userAId !== senderId && convo.userBId !== senderId) {
      throw new ForbiddenError('You are not part of this conversation');
    }
    const recipientId = convo.userAId === senderId ? convo.userBId : convo.userAId;

    await blocksService.assertNotBlocked(senderId, recipientId, 'You cannot message this user');

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId, body: trimmed },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Best-effort notification — don't block message send on it.
    notificationsService
      .createNotification(
        recipientId,
        'SYSTEM',
        'New message',
        trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
        { conversationId, messageId: message.id }
      )
      .catch(() => {});

    // Real-time push + offline email fallback. Fire-and-forget; do not block.
    (async () => {
      const { io } = await import('@sockets/index');
      const payload = { conversationId, message };
      io?.to(`user:${recipientId}`).emit('message:new', payload);
      io?.to(`user:${senderId}`).emit('message:sent', payload);
      // Update last-seen marker for sender (active right now).
      const redis = (await import('@config/redis')).default;
      await redis
        .setex(`presence:lastseen:${senderId}`, 86400, Date.now().toString())
        .catch(() => {});

      // Check whether the recipient has been offline for 10+ minutes.
      const lastSeenRaw = await redis.get(`presence:lastseen:${recipientId}`).catch(() => null);
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
      const offlineMs = Date.now() - lastSeen;
      if (lastSeen === 0 || offlineMs > 10 * 60 * 1000) {
        const throttleKey = `msg-email-throttle:${conversationId}:${recipientId}`;
        const existing = await redis.get(throttleKey).catch(() => null);
        if (!existing) {
          await redis.setex(throttleKey, 3600, '1').catch(() => {});
          const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { email: true, profile: { select: { firstName: true } } },
          });
          const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { profile: { select: { firstName: true, lastName: true } } },
          });
          if (recipient?.email) {
            const { addEmailJob } = await import('@jobs/email.queue');
            const senderName = sender?.profile
              ? `${sender.profile.firstName} ${sender.profile.lastName}`.trim()
              : 'Someone';
            const FRONTEND_URL = (await import('@config/env')).env.FRONTEND_URL;
            await addEmailJob('newMessage', {
              to: recipient.email,
              name: recipient.profile?.firstName ?? 'there',
              senderName,
              messagePreview: trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed,
              conversationUrl: `${FRONTEND_URL}/messages/${conversationId}`,
            });
          }
        }
      }
    })().catch(() => {});

    return message;
  }

  /** Mark every unread message from the OTHER party as read. */
  async markAsRead(conversationId: string, userId: string) {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userAId: true, userBId: true },
    });
    if (!convo) throw new NotFoundError('Conversation');
    if (convo.userAId !== userId && convo.userBId !== userId) {
      throw new ForbiddenError('You are not part of this conversation');
    }
    const result = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { markedRead: result.count };
  }

  /** Total unread across all conversations — for nav badge. */
  async unreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
    });
  }
}

export default new MessagesService();
