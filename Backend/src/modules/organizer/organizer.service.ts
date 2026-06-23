import prisma from '@config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { parseAttendeeCsv } from '@utils/csvImport';
import { sendEmail, inviteClaimEmail } from '@utils/email';
import authService from '@modules/auth/auth.service';
import { addEmailJob } from '@jobs/email.queue';
import logger from '@utils/logger';

export class OrganizerService {
  async getDashboardStats(organizerId: string) {
    const [totalEvents, upcomingEvents, totalRegistrations, totalLeads] = await Promise.all([
      prisma.event.count({ where: { organizerId, deletedAt: null } }),
      prisma.event.count({
        where: {
          organizerId,
          deletedAt: null,
          status: 'PUBLISHED',
          startDate: { gte: new Date() },
        },
      }),
      prisma.eventRegistration.count({
        where: {
          event: { organizerId },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.lead.count({ where: { organizerId } }),
    ]);

    const recentEvents = await prisma.event.findMany({
      where: { organizerId, deletedAt: null },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
      },
    });

    return {
      totalEvents,
      upcomingEvents,
      totalAttendees: totalRegistrations,
      totalLeads,
      recentEvents: recentEvents.map((e) => ({
        ...e,
        registeredCount: e._count.registrations,
      })),
    };
  }

  async getLeads(
    organizerId: string,
    filters: { status?: string; eventId?: string; search?: string },
    page?: number,
    limit?: number
  ) {
    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = { organizerId };

    if (filters.status) where.status = filters.status;
    if (filters.eventId) where.eventId = filters.eventId;

    if (filters.search) {
      where.attendee = {
        profile: {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { company: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          attendee: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  company: true,
                  position: true,
                  linkedin: true,
                  twitter: true,
                  website: true,
                },
              },
            },
          },
          event: {
            select: { id: true, title: true, startDate: true },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      leads: leads.map((lead) => ({
        ...lead,
        attendeeEmail: lead.attendee.email,
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async updateLeadStatus(
    leadId: string,
    organizerId: string,
    status: string,
    notes?: string
  ) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundError('Lead');
    if (lead.organizerId !== organizerId) {
      throw new ForbiddenError('You do not have access to this lead');
    }

    return prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status as 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'ARCHIVED',
        notes: notes ?? lead.notes,
      },
    });
  }

  async exportLeads(organizerId: string, eventId?: string) {
    const where: Record<string, unknown> = { organizerId };
    if (eventId) where.eventId = eventId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        attendee: {
          include: {
            profile: true,
          },
        },
        event: {
          select: { id: true, title: true, startDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      notes: lead.notes,
      firstName: lead.attendee.profile?.firstName ?? '',
      lastName: lead.attendee.profile?.lastName ?? '',
      email: lead.attendee.email,
      company: lead.attendee.profile?.company ?? '',
      position: lead.attendee.profile?.position ?? '',
      linkedin: lead.attendee.profile?.linkedin ?? '',
      eventTitle: lead.event.title,
      eventDate: lead.event.startDate.toISOString(),
      registeredAt: lead.createdAt.toISOString(),
    }));
  }

  async getAttendeeDirectory(
    organizerId: string,
    eventId?: string,
    page?: number,
    limit?: number,
    search?: string
  ) {
    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = {
      event: { organizerId, deletedAt: null },
      status: { not: 'CANCELLED' },
    };

    if (eventId) where.eventId = eventId;

    if (search) {
      where.user = {
        profile: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
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
                  linkedin: true,
                  skills: true,
                },
              },
              founderCard: { select: { status: true } },
              gamification: { select: { fkScore: true, level: true } },
            },
          },
          event: { select: { id: true, title: true, startDate: true } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    return {
      attendees: registrations.map((r) => ({
        ...r,
        email: r.user.email,
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getEventAnalytics(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');

    const [
      totalRegistrations,
      attendedCount,
      cancelledCount,
      waitlistedCount,
      registrationsByDay,
      leadsByStatus,
    ] = await Promise.all([
      prisma.eventRegistration.count({ where: { eventId } }),
      prisma.eventRegistration.count({ where: { eventId, status: 'ATTENDED' } }),
      prisma.eventRegistration.count({ where: { eventId, status: 'CANCELLED' } }),
      prisma.eventRegistration.count({ where: { eventId, status: 'WAITLISTED' } }),
      prisma.eventRegistration.groupBy({
        by: ['registeredAt'],
        where: { eventId },
        _count: true,
        orderBy: { registeredAt: 'asc' },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where: { eventId },
        _count: true,
      }),
    ]);

    const conversionRate =
      totalRegistrations > 0
        ? Math.round((attendedCount / totalRegistrations) * 100)
        : 0;

    return {
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        capacity: event.capacity,
      },
      registrations: {
        total: totalRegistrations,
        attended: attendedCount,
        cancelled: cancelledCount,
        waitlisted: waitlistedCount,
        active: totalRegistrations - cancelledCount,
        conversionRate,
        capacityUtilization: Math.round((totalRegistrations / event.capacity) * 100),
      },
      timeline: registrationsByDay,
      leads: leadsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>
      ),
    };
  }

  async sendEventBlast(
    eventId: string,
    organizerId: string,
    subject: string,
    body: string,
    audience: 'all' | 'registered' | 'waitlist'
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });
    if (!event) throw new NotFoundError('Event');

    const statusFilter: Record<string, unknown> =
      audience === 'registered'
        ? { status: 'REGISTERED' }
        : audience === 'waitlist'
        ? { status: 'WAITLISTED' }
        : { status: { not: 'CANCELLED' } };

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, ...statusFilter },
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { firstName: true } },
          },
        },
      },
    });

    // Enqueue one email per recipient with {{firstName}} substitution.
    let queued = 0;
    for (const r of registrations) {
      const firstName = r.user.profile?.firstName ?? '';
      const personalizedBody = body.replace(/\{\{\s*firstName\s*\}\}/g, firstName);
      try {
        await addEmailJob('eventBlast', {
          to: r.user.email,
          name: firstName,
          subject,
          bodyHtml: personalizedBody,
        });
        queued += 1;
      } catch (err) {
        logger.warn('Failed to enqueue blast email', { eventId, to: r.user.email, err });
      }
    }
    return { sent: queued, recipients: registrations.map((r) => r.user.email) };
  }

  async checkInAttendee(eventId: string, organizerId: string, userId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });
    if (!event) throw new NotFoundError('Event');

    const registration = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) throw new NotFoundError('Registration');
    if (registration.status === 'CANCELLED') {
      throw new BadRequestError('Cannot check in a cancelled registration');
    }
    if (registration.checkedIn) {
      throw new BadRequestError('Attendee is already checked in');
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        status: 'ATTENDED',
      },
      include: {
        user: {
          include: {
            profile: { select: { firstName: true, lastName: true, avatar: true, company: true } },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Assign an event-scoped role (VIP / SPEAKER / STAFF / SPONSOR / ATTENDEE)
   * to a registered attendee. Only the event organizer (or admin) may call.
   */
  // ─── Phase 5.10 — Speakers + agenda CRUD ──────────────────────────────────

  /**
   * True when the user is the event organizer OR a co-organizer.
   * Used by every organizer-only endpoint that should also accept co-hosts.
   */
  async isEventManager(userId: string, eventId: string): Promise<boolean> {
    const ev = await prisma.event.findFirst({
      where: {
        id: eventId,
        deletedAt: null,
        OR: [{ organizerId: userId }, { coorganizers: { some: { userId } } }],
      },
      select: { id: true },
    });
    return !!ev;
  }

  private async assertEventOwner(eventId: string, organizerId: string) {
    const ok = await this.isEventManager(organizerId, eventId);
    if (!ok) throw new NotFoundError('Event');
  }

  // ─── Phase 5.11 — Co-organizers ───────────────────────────────────────────

  async listCoorganizers(eventId: string, callerId: string) {
    await this.assertEventOwner(eventId, callerId);
    return prisma.eventCoorganizer.findMany({
      where: { eventId },
      include: {
        user: {
          include: { profile: { select: { firstName: true, lastName: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addCoorganizer(
    eventId: string,
    callerId: string,
    dto: { email: string; role?: string }
  ) {
    // Only the primary organizer can add co-hosts (not other co-hosts).
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: callerId, deletedAt: null },
      select: { id: true, organizerId: true },
    });
    if (!event) {
      throw new ForbiddenError(
        'Only the primary organizer can add co-hosts'
      );
    }

    const target = await prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true },
    });
    if (!target) throw new NotFoundError('User with that email');
    if (target.id === event.organizerId) {
      throw new BadRequestError('That user is already the primary organizer');
    }

    const created = await prisma.eventCoorganizer.upsert({
      where: { eventId_userId: { eventId, userId: target.id } },
      create: { eventId, userId: target.id, role: dto.role ?? 'COHOST' },
      update: { role: dto.role ?? 'COHOST' },
    });

    const { default: notificationsService } = await import(
      '@modules/notifications/notifications.service'
    );
    notificationsService
      .createNotification(
        target.id,
        'SYSTEM',
        'You were added as a co-host',
        'You can now manage this event alongside the organizer.',
        { eventId }
      )
      .catch(() => {});

    return created;
  }

  async removeCoorganizer(eventId: string, callerId: string, userId: string): Promise<void> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: callerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      throw new ForbiddenError('Only the primary organizer can remove co-hosts');
    }
    await prisma.eventCoorganizer
      .delete({ where: { eventId_userId: { eventId, userId } } })
      .catch(() => {});
  }

  async createSpeaker(
    eventId: string,
    organizerId: string,
    dto: { name: string; title?: string; company?: string; bio?: string; avatar?: string; position?: number }
  ) {
    await this.assertEventOwner(eventId, organizerId);
    if (!dto.name?.trim()) throw new BadRequestError('Name is required');
    return prisma.eventSpeaker.create({
      data: {
        eventId,
        name: dto.name.trim(),
        title: dto.title ?? null,
        company: dto.company ?? null,
        bio: dto.bio ?? null,
        avatar: dto.avatar ?? null,
        position: dto.position ?? 0,
      },
    });
  }

  async deleteSpeaker(eventId: string, organizerId: string, speakerId: string): Promise<void> {
    await this.assertEventOwner(eventId, organizerId);
    await prisma.eventSpeaker.delete({ where: { id: speakerId } });
  }

  async createAgendaItem(
    eventId: string,
    organizerId: string,
    dto: {
      startsAt: string;
      endsAt?: string;
      title: string;
      description?: string;
      speakerId?: string;
    }
  ) {
    await this.assertEventOwner(eventId, organizerId);
    if (!dto.title?.trim()) throw new BadRequestError('Title is required');
    if (!dto.startsAt) throw new BadRequestError('Start time is required');
    return prisma.eventAgendaItem.create({
      data: {
        eventId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        speakerId: dto.speakerId ?? null,
      },
    });
  }

  async deleteAgendaItem(eventId: string, organizerId: string, itemId: string): Promise<void> {
    await this.assertEventOwner(eventId, organizerId);
    await prisma.eventAgendaItem.delete({ where: { id: itemId } });
  }

  /** Custom registration question CRUD — organizer-only. */
  async createQuestion(
    eventId: string,
    organizerId: string,
    dto: { prompt: string; type?: string; options?: string[]; required?: boolean; position?: number }
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new NotFoundError('Event');
    if (!dto.prompt?.trim()) throw new BadRequestError('Prompt is required');

    return prisma.eventQuestion.create({
      data: {
        eventId,
        prompt: dto.prompt.trim(),
        type: dto.type ?? 'TEXT',
        options: dto.options ?? undefined,
        required: dto.required ?? false,
        position: dto.position ?? 0,
      },
    });
  }

  async updateQuestion(
    eventId: string,
    organizerId: string,
    questionId: string,
    dto: { prompt?: string; type?: string; options?: string[]; required?: boolean; position?: number }
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new NotFoundError('Event');

    return prisma.eventQuestion.update({
      where: { id: questionId },
      data: {
        prompt: dto.prompt?.trim(),
        type: dto.type,
        options: dto.options ?? undefined,
        required: dto.required,
        position: dto.position,
      },
    });
  }

  async deleteQuestion(eventId: string, organizerId: string, questionId: string): Promise<void> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new NotFoundError('Event');
    await prisma.eventQuestion.delete({ where: { id: questionId } });
  }

  /**
   * Approve / deny a registration that was created in PENDING_APPROVAL state
   * for a curated event. Organizer-only.
   */
  async actionPendingRegistration(
    eventId: string,
    organizerId: string,
    registrationId: string,
    action: 'APPROVE' | 'DENY'
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) throw new NotFoundError('Event');

    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, eventId: true, userId: true, status: true },
    });
    if (!reg || reg.eventId !== eventId) throw new NotFoundError('Registration');
    if (reg.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError('Only pending registrations can be approved or denied');
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: reg.id },
      data: {
        status: action === 'APPROVE' ? 'REGISTERED' : 'CANCELLED',
      },
    });

    // On approval, issue the ticket perks (score + lead + QR confirmation email).
    if (action === 'APPROVE') {
      const { default: eventsService } = await import('@modules/events/events.service');
      eventsService.onRegistrationApproved(reg.id).catch(() => {});
    }

    // Best-effort notification — let the requester know.
    const { default: notificationsService } = await import(
      '@modules/notifications/notifications.service'
    );
    notificationsService
      .createNotification(
        reg.userId,
        action === 'APPROVE' ? 'REGISTRATION_APPROVED' : 'SYSTEM',
        action === 'APPROVE'
          ? `You're in! ${event.title} approved your request`
          : `Your request for ${event.title} was declined`,
        action === 'APPROVE'
          ? 'See you there — your QR ticket is on its way by email.'
          : 'Reach out to the organizer if you have questions.',
        { eventId }
      )
      .catch(() => {});

    return updated;
  }

  /**
   * Organizer-initiated refund: cancels the attendee's registration on their
   * behalf, which refunds any paid ticket, frees the seat (waitlist promote),
   * and emails the attendee. Manager-only (organizer or co-host).
   */
  async refundAttendee(eventId: string, attendeeUserId: string, callerId: string) {
    await this.assertEventOwner(eventId, callerId);
    const { default: eventsService } = await import('@modules/events/events.service');
    await eventsService.cancelRegistration(eventId, attendeeUserId);
    return { refunded: true };
  }

  async listPendingRegistrations(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new NotFoundError('Event');

    return prisma.eventRegistration.findMany({
      where: { eventId, status: 'PENDING_APPROVAL' },
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
                location: true,
              },
            },
          },
        },
        answers: {
          include: { question: { select: { prompt: true, type: true } } },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });
  }

  async setEventRole(
    eventId: string,
    organizerId: string,
    targetUserId: string,
    role: 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR'
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true },
    });
    if (!event) throw new NotFoundError('Event');

    const reg = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: targetUserId } },
    });
    if (!reg) throw new NotFoundError('Registration');

    return prisma.eventRegistration.update({
      where: { id: reg.id },
      data: { eventRole: role },
    });
  }

  /**
   * Networking analytics for the organizer's InsightsTab — purely SQL
   * aggregations over Connection + EventTap + EventRegistration. Cached at
   * the React Query level on the client.
   */
  async getNetworkingAnalytics(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) throw new NotFoundError('Event');

    const [connectionCount, tapCount, registrations, connectionRows] =
      await Promise.all([
        prisma.connection.count({ where: { eventId } }),
        prisma.eventTap.count({ where: { eventId } }),
        prisma.eventRegistration.findMany({
          where: { eventId, status: { not: 'CANCELLED' } },
          select: { userId: true, checkedIn: true },
        }),
        prisma.connection.findMany({
          where: { eventId },
          select: { requesterId: true, receiverId: true },
        }),
      ]);

    // Per-user connection count for top-connectors leaderboard.
    const tally = new Map<string, number>();
    for (const c of connectionRows) {
      tally.set(c.requesterId, (tally.get(c.requesterId) ?? 0) + 1);
      tally.set(c.receiverId, (tally.get(c.receiverId) ?? 0) + 1);
    }
    const topUserIds = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    const topUsers =
      topUserIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: topUserIds } },
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true, position: true },
              },
            },
          });
    const topConnectors = topUserIds.map((id) => {
      const u = topUsers.find((x) => x.id === id);
      return {
        userId: id,
        connections: tally.get(id) ?? 0,
        firstName: u?.profile?.firstName ?? null,
        lastName: u?.profile?.lastName ?? null,
        avatar: u?.profile?.avatar ?? null,
        position: u?.profile?.position ?? null,
      };
    });

    // Networking funnel: registered → checkedIn → made≥1 → made≥3
    const totalRegistered = registrations.length;
    const totalCheckedIn = registrations.filter((r) => r.checkedIn).length;
    const madeAtLeast = (n: number) =>
      registrations.filter((r) => (tally.get(r.userId) ?? 0) >= n).length;

    return {
      event,
      connections: connectionCount,
      taps: tapCount,
      scanToConnectionRate: tapCount === 0 ? null : connectionCount / tapCount,
      funnel: {
        registered: totalRegistered,
        checkedIn: totalCheckedIn,
        madeOneConnection: madeAtLeast(1),
        madeThreeConnections: madeAtLeast(3),
      },
      topConnectors,
    };
  }

  /**
   * Parse a CSV attendee list and either dry-run preview it or commit the
   * import. Each row may create a User stub (password=null, isEmailVerified=
   * false) on first import — they claim the account via magic link in a later
   * phase. Existing users + existing registrations are deduped.
   */
  async importAttendeesCsv(
    eventId: string,
    organizerId: string,
    fileBuffer: Buffer,
    options: { dryRun: boolean }
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true, title: true, capacity: true },
    });
    if (!event) throw new NotFoundError('Event');

    const text = fileBuffer.toString('utf-8');
    const parsed = parseAttendeeCsv(text);

    if (parsed.valid.length === 0 && parsed.invalid.length === 0) {
      throw new BadRequestError('CSV is empty');
    }

    const emails = parsed.valid.map((r) => r.email);
    const [existingUsers, existingRegistrations] = await Promise.all([
      prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true },
      }),
      prisma.eventRegistration.findMany({
        where: {
          eventId,
          user: { email: { in: emails } },
        },
        select: { user: { select: { email: true } } },
      }),
    ]);
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const alreadyRegisteredEmails = new Set(
      existingRegistrations.map((r) => r.user.email.toLowerCase())
    );

    const willCreateUsers = parsed.valid.filter(
      (r) => !existingEmailSet.has(r.email)
    ).length;
    const willCreateRegistrations = parsed.valid.filter(
      (r) => !alreadyRegisteredEmails.has(r.email)
    ).length;
    const duplicates = parsed.valid
      .filter((r) => alreadyRegisteredEmails.has(r.email))
      .map((r) => r.email);

    const summary = {
      totalRows: parsed.valid.length + parsed.invalid.length,
      validRows: parsed.valid.length,
      invalidRows: parsed.invalid.length,
      duplicateCount: duplicates.length,
      willCreateUsers,
      willCreateRegistrations,
    };

    if (options.dryRun) {
      return {
        dryRun: true,
        summary,
        valid: parsed.valid,
        invalid: parsed.invalid,
        duplicates,
      };
    }

    let createdUsers = 0;
    let createdRegs = 0;
    let invitesSent = 0;

    for (const row of parsed.valid) {
      if (alreadyRegisteredEmails.has(row.email)) continue;

      // Find-or-create user (no password — claim via magic link).
      let userId = existingUsers.find((u) => u.email.toLowerCase() === row.email)?.id;
      let isNewStub = false;
      if (!userId) {
        const created = await prisma.user.create({
          data: {
            email: row.email,
            password: null,
            authProvider: 'invite',
            isEmailVerified: false,
            profile:
              row.firstName || row.lastName || row.company
                ? {
                    create: {
                      firstName: row.firstName ?? '',
                      lastName: row.lastName ?? '',
                      company: row.company ?? null,
                    },
                  }
                : undefined,
          },
          select: { id: true },
        });
        userId = created.id;
        createdUsers++;
        isNewStub = true;
      }

      await prisma.eventRegistration.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: {
          eventId,
          userId,
          status: 'REGISTERED',
          eventRole: row.eventRole ?? 'ATTENDEE',
        },
        update: { eventRole: row.eventRole ?? undefined },
      });
      createdRegs++;

      // For new stubs, mint a claim token + email a magic link. For existing
      // users, just email an event-invite (they already have credentials).
      if (isNewStub) {
        const claimUrl = await authService.generateClaimToken(userId).catch(() => null);
        if (claimUrl) {
          const displayName = [row.firstName, row.lastName].filter(Boolean).join(' ');
          sendEmail(
            row.email,
            `You're invited to ${event.title} — Founder Key`,
            inviteClaimEmail(displayName, claimUrl, event.title)
          )
            .then(() => {
              invitesSent++;
            })
            .catch(() => {});
        }
      } else {
        sendEmail(
          row.email,
          `You're registered for ${event.title} — Founder Key`,
          `<p>You've been registered for <strong>${event.title}</strong>.</p>` +
            `<p>Sign in to view your ticket.</p>`
        )
          .then(() => {
            invitesSent++;
          })
          .catch(() => {});
      }
    }

    return {
      dryRun: false,
      summary: {
        ...summary,
        createdUsers,
        createdRegistrations: createdRegs,
        invitesSent,
      },
      duplicates,
      invalid: parsed.invalid,
    };
  }

  async getEventGuests(
    eventId: string,
    organizerId: string,
    page?: number,
    limit?: number,
    search?: string,
    status?: string
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });
    if (!event) throw new NotFoundError('Event');

    const pagination = parsePaginationQuery({ page, limit });

    const where: Record<string, unknown> = { eventId };
    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          {
            profile: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      };
    }

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
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
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.eventRegistration.count({ where }),
    ]);

    return {
      guests: registrations.map((r) => ({
        id: r.id,
        userId: r.userId,
        status: r.status,
        eventRole: r.eventRole,
        checkedIn: r.checkedIn,
        checkedInAt: r.checkedInAt,
        registeredAt: r.registeredAt,
        amountPaid: r.amountPaid,
        paymentStatus: r.paymentStatus,
        ticketTierName: r.ticketTierName,
        email: r.user.email,
        profile: r.user.profile,
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
      event: { id: event.id, title: event.title, capacity: event.capacity },
    };
  }

  async duplicateEvent(sourceEventId: string, callerId: string) {
    const source = await prisma.event.findFirst({
      where: { id: sourceEventId, deletedAt: null },
      include: {
        speakers: true,
        agendaItems: true,
        questions: true,
      },
    });
    if (!source) throw new NotFoundError('Event');
    if (source.organizerId !== callerId) {
      const ok = await this.isEventManager(callerId, sourceEventId);
      if (!ok) throw new ForbiddenError('You cannot duplicate this event');
    }

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const newStart = new Date(source.startDate.getTime() + sevenDays);
    const newEnd = new Date(source.endDate.getTime() + sevenDays);
    const baseSlug = `${source.slug ?? 'event'}-copy-${Date.now().toString(36)}`;

    const cloned = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          organizerId: source.organizerId,
          title: `${source.title} (Copy)`,
          description: source.description,
          startDate: newStart,
          endDate: newEnd,
          locationType: source.locationType,
          address: source.address,
          city: source.city,
          country: source.country,
          meetingUrl: source.meetingUrl,
          capacity: source.capacity,
          ticketPrice: source.ticketPrice,
          coverImage: source.coverImage,
          tags: source.tags,
          status: 'DRAFT',
          category: source.category,
          theme: source.theme,
          slug: baseSlug,
          requiresApproval: source.requiresApproval,
          waitlistEnabled: source.waitlistEnabled,
          visibility: source.visibility,
          timezone: source.timezone,
          ticketTypes: source.ticketTypes ?? undefined,
        },
      });

      const speakerIdMap = new Map<string, string>();
      for (const sp of source.speakers) {
        const created = await tx.eventSpeaker.create({
          data: {
            eventId: newEvent.id,
            name: sp.name,
            title: sp.title,
            company: sp.company,
            bio: sp.bio,
            avatar: sp.avatar,
            position: sp.position,
          },
        });
        speakerIdMap.set(sp.id, created.id);
      }

      for (const item of source.agendaItems) {
        const offset = item.startsAt.getTime() - source.startDate.getTime();
        const newStartsAt = new Date(newStart.getTime() + offset);
        const newEndsAt = item.endsAt
          ? new Date(newStart.getTime() + (item.endsAt.getTime() - source.startDate.getTime()))
          : null;
        await tx.eventAgendaItem.create({
          data: {
            eventId: newEvent.id,
            startsAt: newStartsAt,
            endsAt: newEndsAt,
            title: item.title,
            description: item.description,
            speakerId: item.speakerId ? speakerIdMap.get(item.speakerId) ?? null : null,
          },
        });
      }

      for (const q of source.questions) {
        await tx.eventQuestion.create({
          data: {
            eventId: newEvent.id,
            prompt: q.prompt,
            type: q.type,
            options: q.options ?? undefined,
            required: q.required,
            position: q.position,
          },
        });
      }

      return newEvent;
    });

    return cloned;
  }

  async exportAttendeesCsv(eventId: string, callerId: string): Promise<string> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) throw new NotFoundError('Event');
    if (event.organizerId !== callerId) {
      const ok = await this.isEventManager(callerId, eventId);
      if (!ok) throw new ForbiddenError('You cannot export attendees for this event');
    }

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      include: {
        user: {
          include: {
            profile: {
              select: { firstName: true, lastName: true, company: true, position: true, phone: true },
            },
          },
        },
      },
      orderBy: { registeredAt: 'asc' },
    });

    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Company',
      'Position',
      'Status',
      'Event Role',
      'Checked In',
      'Checked In At',
      'Registered At',
    ];

    const rows = registrations.map((r) => [
      escape(r.user.profile?.firstName),
      escape(r.user.profile?.lastName),
      escape(r.user.email),
      escape(r.user.profile?.phone),
      escape(r.user.profile?.company),
      escape(r.user.profile?.position),
      escape(r.status),
      escape(r.eventRole),
      escape(r.checkedIn ? 'Yes' : 'No'),
      escape(r.checkedInAt ? r.checkedInAt.toISOString() : ''),
      escape(r.registeredAt.toISOString()),
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
  }
}

export default new OrganizerService();
