import prisma from '@config/database';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { SCORE_VALUES } from '@config/constants';
import gamificationService from '@modules/gamification/gamification.service';
import notificationsService from '@modules/notifications/notifications.service';
import blocksService from '@modules/blocks/blocks.service';
import { addEmailJob } from '@jobs/email.queue';

export class ConnectionsService {
  async sendRequest(requesterId: string, receiverId: string) {
    if (requesterId === receiverId) {
      throw new BadRequestError('You cannot connect with yourself');
    }

    await blocksService.assertNotBlocked(
      requesterId,
      receiverId,
      'You cannot connect with this user'
    );

    const receiver = await prisma.user.findFirst({
      where: { id: receiverId, deletedAt: null, isActive: true },
      include: { profile: true },
    });

    if (!receiver) throw new NotFoundError('User');

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictError('You are already connected with this user');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictError('A connection request already exists');
      }
      if (existing.status === 'REJECTED') {
        // Allow re-sending after rejection
        return prisma.connection.update({
          where: { id: existing.id },
          data: { status: 'PENDING', requesterId, receiverId },
        });
      }
    }

    // Race-safe insert: two simultaneous send-request calls can both pass the
    // findFirst check above and create duplicate PENDING rows. The
    // @@unique([requesterId, receiverId]) constraint catches the second insert
    // (P2002); we surface the same conflict message and return the existing row.
    let connection;
    try {
      connection = await prisma.connection.create({
        data: { requesterId, receiverId, status: 'PENDING' },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        const existingDup = await prisma.connection.findUnique({
          where: { requesterId_receiverId: { requesterId, receiverId } },
        });
        if (existingDup) return existingDup;
      }
      throw err;
    }

    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      include: { profile: true },
    });

    const requesterName = requester?.profile
      ? `${requester.profile.firstName} ${requester.profile.lastName}`
      : 'Someone';

    // Notify receiver in-app
    await notificationsService
      .createNotification(
        receiverId,
        'CONNECTION_REQUEST',
        'New Connection Request',
        `${requesterName} wants to connect with you`,
        { connectionId: connection.id, requesterId }
      )
      .catch(() => {});

    // Email the receiver too.
    addEmailJob('connectionRequest', {
      to: receiver.email,
      name: receiver.profile ? `${receiver.profile.firstName} ${receiver.profile.lastName}` : 'there',
      requesterName,
      requesterCompany: requester?.profile?.company ?? undefined,
    }).catch(() => {});

    return connection;
  }

  async respondToRequest(connectionId: string, userId: string, action: 'ACCEPT' | 'REJECT') {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) throw new NotFoundError('Connection request');
    if (connection.receiverId !== userId) {
      throw new ForbiddenError('You can only respond to requests sent to you');
    }
    if (connection.status !== 'PENDING') {
      throw new BadRequestError('This connection request has already been responded to');
    }

    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: newStatus },
    });

    if (action === 'ACCEPT') {
      // Add FK score to both users
      await Promise.all([
        gamificationService
          .addScore(userId, 'CONNECTION_MADE', SCORE_VALUES.CONNECTION_MADE, { connectionId })
          .catch(() => {}),
        gamificationService
          .addScore(
            connection.requesterId,
            'CONNECTION_MADE',
            SCORE_VALUES.CONNECTION_MADE,
            { connectionId }
          )
          .catch(() => {}),
      ]);

      // Notify requester
      const receiver = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      const receiverName = receiver?.profile
        ? `${receiver.profile.firstName} ${receiver.profile.lastName}`
        : 'Someone';

      await notificationsService
        .createNotification(
          connection.requesterId,
          'CONNECTION_ACCEPTED',
          'Connection Accepted',
          `${receiverName} accepted your connection request`,
          { connectionId, userId }
        )
        .catch(() => {});
    } else {
      // REJECT: notify the requester so the pending row's outcome isn't a
      // silent black hole. Neutral wording — don't name the rejecter.
      await notificationsService
        .createNotification(
          connection.requesterId,
          'SYSTEM',
          'Connection request closed',
          'A connection request you sent was not accepted.',
          { connectionId }
        )
        .catch(() => {});
    }

    return updated;
  }

  async removeConnection(connectionId: string, userId: string): Promise<void> {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) throw new NotFoundError('Connection');
    if (connection.requesterId !== userId && connection.receiverId !== userId) {
      throw new ForbiddenError('You do not have permission to remove this connection');
    }

    await prisma.connection.delete({ where: { id: connectionId } });
  }

  async getConnections(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const where = {
      status: 'ACCEPTED' as const,
      OR: [{ requesterId: userId }, { receiverId: userId }],
    };

    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        include: {
          requester: {
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
          receiver: {
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
          event: {
            select: { id: true, title: true, startDate: true, endDate: true },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.connection.count({ where }),
    ]);

    // Return the "other" user from the perspective of the current user
    const connectionsList = connections.map((c) => {
      const otherUser = c.requesterId === userId ? c.receiver : c.requester;
      return {
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        event: c.event,
        user: otherUser,
      };
    });

    return {
      connections: connectionsList,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getPendingRequests(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const [requests, total] = await Promise.all([
      prisma.connection.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        include: {
          requester: {
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.connection.count({ where: { receiverId: userId, status: 'PENDING' } }),
    ]);

    return {
      requests,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getSentRequests(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const [requests, total] = await Promise.all([
      prisma.connection.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: {
          receiver: {
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.connection.count({ where: { requesterId: userId, status: 'PENDING' } }),
    ]);

    return {
      requests,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async checkConnectionStatus(userId: string, targetId: string) {
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetId },
          { requesterId: targetId, receiverId: userId },
        ],
      },
    });

    return {
      status: connection?.status ?? null,
      connectionId: connection?.id ?? null,
      isRequester: connection?.requesterId === userId,
    };
  }

  /**
   * Resolve a scan target (qrData | slug | targetUserId) → userId.
   * QR data accepts both legacy base64 JSON and the new /c/:slug URL.
   */
  private async resolveScanTarget(input: {
    qrData?: string;
    slug?: string;
    targetUserId?: string;
  }): Promise<string> {
    if (input.targetUserId) return input.targetUserId;

    if (input.slug) {
      const card = await prisma.founderCard.findUnique({
        where: { publicSlug: input.slug },
        select: { userId: true },
      });
      if (!card) throw new NotFoundError('Founder Card');
      return card.userId;
    }

    if (input.qrData) {
      const raw = input.qrData.trim();

      // Slug URL pattern: ".../c/<slug>"
      const slugMatch = raw.match(/\/c\/([A-Za-z0-9]+)/);
      if (slugMatch) {
        const card = await prisma.founderCard.findUnique({
          where: { publicSlug: slugMatch[1] },
          select: { userId: true },
        });
        if (card) return card.userId;
      }

      // In-app card URL: ".../card/<uuid>" — used when the user has no
      // FounderCard yet, so the QR encodes the userId directly.
      const userMatch = raw.match(/\/card\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (userMatch) return userMatch[1];

      // Bare UUID, in case someone pastes just the id.
      const uuidMatch = raw.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
      if (uuidMatch) return uuidMatch[1];

      // Legacy base64 JSON payload
      try {
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as {
          userId?: string;
        };
        if (parsed.userId) return parsed.userId;
      } catch {
        // fall through
      }
    }

    throw new BadRequestError('Invalid QR code data');
  }

  async connectViaQR(
    scannerId: string,
    input: {
      qrData?: string;
      slug?: string;
      targetUserId?: string;
      eventId?: string;
      method?: 'QR' | 'NFC' | 'MANUAL';
    }
  ) {
    const cardOwnerId = await this.resolveScanTarget(input);

    if (scannerId === cardOwnerId) {
      throw new BadRequestError('You cannot connect with yourself via QR');
    }

    // Verify event id is real before we trust it on the Connection row.
    let validEventId: string | null = null;
    if (input.eventId) {
      const event = await prisma.event.findFirst({
        where: { id: input.eventId, deletedAt: null },
        select: { id: true },
      });
      validEventId = event?.id ?? null;
    }

    await gamificationService
      .addScore(scannerId, 'QR_SCAN', SCORE_VALUES.QR_SCAN, { targetUserId: cardOwnerId })
      .catch(() => {});

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: scannerId, receiverId: cardOwnerId },
          { requesterId: cardOwnerId, receiverId: scannerId },
        ],
      },
    });

    let connection;
    let isNew = false;
    let resultedInConnection = false;

    if (existing?.status === 'ACCEPTED') {
      // Backfill eventId on the existing row if this scan is event-scoped and
      // the row didn't already have one — preserves "first event we met at".
      if (validEventId && !existing.eventId) {
        connection = await prisma.connection.update({
          where: { id: existing.id },
          data: { eventId: validEventId },
        });
      } else {
        connection = existing;
      }
    } else if (existing) {
      connection = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          status: 'ACCEPTED',
          ...(validEventId ? { eventId: validEventId } : {}),
        },
      });
      isNew = true;
      resultedInConnection = true;
    } else {
      connection = await prisma.connection.create({
        data: {
          requesterId: scannerId,
          receiverId: cardOwnerId,
          status: 'ACCEPTED',
          eventId: validEventId,
        },
      });
      isNew = true;
      resultedInConnection = true;
    }

    if (isNew) {
      await Promise.all([
        gamificationService
          .addScore(scannerId, 'CONNECTION_MADE', SCORE_VALUES.CONNECTION_MADE)
          .catch(() => {}),
        gamificationService
          .addScore(cardOwnerId, 'CONNECTION_MADE', SCORE_VALUES.CONNECTION_MADE)
          .catch(() => {}),
      ]);
    }

    // Always log the tap when event-scoped — fuels networking analytics +
    // abuse detection regardless of whether a new connection was formed.
    if (validEventId) {
      await prisma.eventTap
        .create({
          data: {
            eventId: validEventId,
            scannerUserId: scannerId,
            targetUserId: cardOwnerId,
            method: input.method ?? 'QR',
            resultedInConnection,
          },
        })
        .catch(() => {});
    }

    return {
      connection,
      message: isNew ? 'Connected successfully via QR' : 'Already connected',
      isNew,
    };
  }

  /**
   * Private notes scoped to (connection, author). The author is the only
   * person who ever sees their own notes — they're not exposed to the other
   * party. Useful for "met at coffee, follow up about Y."
   */
  async listNotesForConnection(connectionId: string, authorId: string) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, requesterId: true, receiverId: true },
    });
    if (!connection) throw new NotFoundError('Connection');
    if (connection.requesterId !== authorId && connection.receiverId !== authorId) {
      throw new ForbiddenError('You can only see notes on your own connections');
    }
    return prisma.connectionNote.findMany({
      where: { connectionId, authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Resolve "the connection between userId + targetId" — used by /card/:userId. */
  async findConnectionBetween(userId: string, targetUserId: string) {
    return prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: userId },
        ],
      },
      select: { id: true, status: true },
    });
  }

  /**
   * Single-call context for the /card/:userId hero. Bundles:
   *  - the existing connection (if any) + which event you met at
   *  - the conversation id (so Message button deep-links)
   *  - events you both registered for (any status except CANCELLED)
   *  - skill / interest / lookingFor intersections
   *  - reverse-direction signal: do they want what you bring? (powers "they're
   *    looking for someone like you" copy)
   */
  async getConnectionContext(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      return {
        connection: null,
        conversation: null,
        commonEvents: [] as Array<{
          id: string;
          title: string;
          startDate: Date;
          city: string | null;
          status: string;
        }>,
        commonSkills: [],
        commonInterests: [],
        commonLookingFor: [],
        theyWantYourSkills: [],
        youWantTheirSkills: [],
      };
    }

    const [meProfile, otherProfile, connection, commonEvents] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { skills: true, interests: true, lookingFor: true },
      }),
      prisma.profile.findUnique({
        where: { userId: otherUserId },
        select: { skills: true, interests: true, lookingFor: true },
      }),
      prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: userId, receiverId: otherUserId },
            { requesterId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          event: { select: { id: true, title: true, startDate: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          deletedAt: null,
          AND: [
            { registrations: { some: { userId, status: { not: 'CANCELLED' } } } },
            { registrations: { some: { userId: otherUserId, status: { not: 'CANCELLED' } } } },
          ],
        },
        select: { id: true, title: true, startDate: true, city: true, status: true },
        orderBy: { startDate: 'desc' },
        take: 10,
      }),
    ]);

    const [aId, bId] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
    const conversation = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: aId, userBId: bId } },
      select: { id: true, lastMessageAt: true },
    });

    const intersect = (a: string[] | null | undefined, b: string[] | null | undefined) =>
      (a ?? []).filter((x) => (b ?? []).includes(x));

    return {
      connection,
      conversation,
      commonEvents,
      commonSkills: intersect(meProfile?.skills, otherProfile?.skills),
      commonInterests: intersect(meProfile?.interests, otherProfile?.interests),
      commonLookingFor: intersect(meProfile?.lookingFor, otherProfile?.lookingFor),
      theyWantYourSkills: intersect(otherProfile?.lookingFor, meProfile?.skills),
      youWantTheirSkills: intersect(meProfile?.lookingFor, otherProfile?.skills),
    };
  }

  async createNote(connectionId: string, authorId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestError('Note cannot be empty');
    if (trimmed.length > 2000) throw new BadRequestError('Note is too long (max 2000 chars)');

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { requesterId: true, receiverId: true },
    });
    if (!connection) throw new NotFoundError('Connection');
    if (connection.requesterId !== authorId && connection.receiverId !== authorId) {
      throw new ForbiddenError('You can only add notes on your own connections');
    }

    return prisma.connectionNote.create({
      data: { connectionId, authorId, body: trimmed },
    });
  }

  async updateNote(noteId: string, authorId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestError('Note cannot be empty');
    const note = await prisma.connectionNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundError('Note');
    if (note.authorId !== authorId) throw new ForbiddenError('Only the author can edit this note');
    return prisma.connectionNote.update({ where: { id: noteId }, data: { body: trimmed } });
  }

  async deleteNote(noteId: string, authorId: string): Promise<void> {
    const note = await prisma.connectionNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundError('Note');
    if (note.authorId !== authorId) throw new ForbiddenError('Only the author can delete this note');
    await prisma.connectionNote.delete({ where: { id: noteId } });
  }

  async suggestConnections(userId: string, limit = 10) {
    const userProfile = await prisma.profile.findUnique({ where: { userId } });
    const userConnections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });

    const connectedIds = new Set<string>([userId]);
    for (const c of userConnections) {
      connectedIds.add(c.requesterId);
      connectedIds.add(c.receiverId);
    }

    const suggestions = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(connectedIds) },
        deletedAt: null,
        isActive: true,
        ...(userProfile?.skills?.length
          ? { profile: { skills: { hasSome: userProfile.skills } } }
          : {}),
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            company: true,
            position: true,
            skills: true,
          },
        },
        gamification: { select: { fkScore: true, level: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return suggestions;
  }
}

export default new ConnectionsService();
