import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import prisma from '@config/database';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '@utils/errors';
import { parsePaginationQuery, buildPaginationMeta } from '@utils/pagination';
import { SCORE_VALUES } from '@config/constants';
import { CreateEventDto, UpdateEventDto, SearchEventsDto, RsvpGuestDto } from './events.validation';
import { sendEmail, eventRsvpConfirmationEmail } from '@utils/email';
import { env } from '@config/env';
import logger from '@utils/logger';
import gamificationService from '@modules/gamification/gamification.service';
import notificationsService from '@modules/notifications/notifications.service';
import { hasFreeOption } from '@utils/ticketPricing';
import paymentsService, { paymentsConfigured } from '@modules/payments/payments.service';

// Safe public shape for an event's organizer. Never `include` the full User
// row on an event — that exposes email/supabaseId/googleId on public endpoints.
const PUBLIC_ORGANIZER_SELECT = {
  id: true,
  username: true,
  profile: {
    select: { firstName: true, lastName: true, avatar: true, company: true },
  },
} as const;

// Maps a Prisma User (with profile / founderCard / gamification eager-loaded)
// to the shape /auth/login returns. Used by guest RSVP auto-sign-in.
function buildAuthUser(
  user: Prisma.UserGetPayload<{
    include: {
      profile: true;
      founderCard: { select: { id: true; status: true; qrCodeUrl: true } };
      gamification: { select: { fkScore: true; level: true } };
    };
  }> | null
) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
    tier: user.tier as 'FREE' | 'FOUNDER',
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          avatar: user.profile.avatar,
          company: user.profile.company,
          position: user.profile.position,
          bio: user.profile.bio,
          location: user.profile.location,
          linkedin: user.profile.linkedin,
          twitter: user.profile.twitter,
          website: user.profile.website,
          skills: user.profile.skills,
          interests: user.profile.interests,
          lookingFor: user.profile.lookingFor,
        }
      : null,
    founderCard: user.founderCard
      ? {
          id: user.founderCard.id,
          status: user.founderCard.status,
          qrCodeUrl: user.founderCard.qrCodeUrl,
        }
      : null,
    gamification: user.gamification
      ? { fkScore: user.gamification.fkScore, level: user.gamification.level }
      : null,
  };
}

export class EventsService {
  private slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  async createEvent(organizerId: string, dto: CreateEventDto) {
    // Auto-generate slug if not provided. Date.now() alone collides when two
    // events are created in the same millisecond; the DB has a UNIQUE index on
    // slug, so on P2002 we retry with a random 4-char suffix.
    let slug = dto.slug;
    if (!slug) {
      const base = this.slugify(dto.title);
      slug = `${base}-${Date.now().toString(36)}`;
    }

    let event;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        event = await this.tryCreateEvent(organizerId, dto, slug);
        break;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'P2002' && attempt < 4) {
          const rand = Math.random().toString(36).slice(2, 6);
          slug = `${this.slugify(dto.title)}-${rand}`;
          continue;
        }
        throw err;
      }
    }
    if (!event) throw new Error('Failed to create event after slug retries');
    return event;
  }

  private async tryCreateEvent(organizerId: string, dto: CreateEventDto, slug: string) {
    const event = await prisma.event.create({
      data: {
        organizerId,
        title: dto.title,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        locationType: dto.type,
        address: dto.location?.address ?? null,
        city: dto.location?.city ?? null,
        country: dto.location?.country ?? null,
        meetingUrl: dto.location?.meetingUrl ?? null,
        capacity: dto.capacity,
        ticketPrice: dto.ticketPrice !== undefined ? new Prisma.Decimal(dto.ticketPrice) : null,
        coverImage: dto.coverImage ?? null,
        tags: dto.tags ?? [],
        category: dto.category ?? null,
        theme: dto.theme ?? 'default',
        slug,
        requiresApproval: dto.requiresApproval ?? false,
        waitlistEnabled: dto.waitlistEnabled ?? true,
        visibility: dto.visibility ?? 'PUBLIC',
        timezone: dto.timezone ?? 'UTC',
        ticketTypes: dto.ticketTypes ? JSON.parse(JSON.stringify(dto.ticketTypes)) : undefined,
        status: 'DRAFT',
      },
      include: { organizer: { select: PUBLIC_ORGANIZER_SELECT } },
    });

    return event;
  }

  async updateEvent(eventId: string, organizerId: string, dto: UpdateEventDto) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');
    if (event.organizerId !== organizerId) {
      throw new ForbiddenError('You do not have permission to update this event');
    }
    if (event.status === 'CANCELLED') {
      throw new BadRequestError('Cannot update a cancelled event');
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.type !== undefined && { locationType: dto.type }),
        ...(dto.location?.address !== undefined && { address: dto.location.address }),
        ...(dto.location?.city !== undefined && { city: dto.location.city }),
        ...(dto.location?.country !== undefined && { country: dto.location.country }),
        ...(dto.location?.meetingUrl !== undefined && { meetingUrl: dto.location.meetingUrl }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.ticketPrice !== undefined && {
          ticketPrice: new Prisma.Decimal(dto.ticketPrice),
        }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.theme !== undefined && { theme: dto.theme }),
        ...(dto.requiresApproval !== undefined && { requiresApproval: dto.requiresApproval }),
        ...(dto.waitlistEnabled !== undefined && { waitlistEnabled: dto.waitlistEnabled }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.ticketTypes !== undefined && {
          ticketTypes: JSON.parse(JSON.stringify(dto.ticketTypes)),
        }),
      },
      include: { organizer: { select: PUBLIC_ORGANIZER_SELECT } },
    });

    return updated;
  }

  async deleteEvent(eventId: string, organizerId: string): Promise<void> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');
    if (event.organizerId !== organizerId) {
      throw new ForbiddenError('You do not have permission to delete this event');
    }
    // Delete is only for drafts. Published/active events must be CANCELLED
    // (which notifies attendees + refunds paid tickets), never silently deleted.
    if (event.status !== 'DRAFT') {
      throw new BadRequestError(
        'Only draft events can be deleted. Use "Cancel event" to take down a published event.'
      );
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });
  }

  async getEvent(eventIdOrSlug: string, userId?: string) {
    // Accept either the UUID or the human-friendly slug (/e/founder-coffee-meetup).
    // Branch on a UUID regex so a slug that *looks* like a UUID prefix doesn't
    // collide with an actual UUID match. Slug is fully unique by index.
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      eventIdOrSlug
    );
    const where = looksLikeUuid
      ? { id: eventIdOrSlug, deletedAt: null }
      : { slug: eventIdOrSlug, deletedAt: null };
    const event = await prisma.event.findFirst({
      where,
      include: {
        organizer: { select: PUBLIC_ORGANIZER_SELECT },
        _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
      },
    });

    if (!event) throw new NotFoundError('Event');

    let registrationStatus = null;
    if (userId) {
      const registration = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
      });
      registrationStatus = registration?.status ?? null;
    }

    // Per-tier sold counts (non-cancelled) so the public page can show "Sold out".
    const tierCounts = await prisma.eventRegistration.groupBy({
      by: ['ticketTierId'],
      where: { eventId: event.id, status: { not: 'CANCELLED' }, ticketTierId: { not: null } },
      _count: { _all: true },
    });
    const soldByTier: Record<string, number> = {};
    for (const t of tierCounts) if (t.ticketTierId) soldByTier[t.ticketTierId] = t._count._all;

    // Connections made at this event — social proof on the public page.
    const connectionsCount = await prisma.connection.count({
      where: { eventId: event.id, status: 'ACCEPTED' },
    });

    return {
      ...event,
      registeredCount: event._count.registrations,
      registrationStatus,
      soldByTier,
      connectionsCount,
    };
  }

  async listEvents(dto: SearchEventsDto) {
    const pagination = parsePaginationQuery({
      page: dto.page,
      limit: dto.limit,
      orderBy: dto.orderBy ?? 'startDate',
      orderDir: dto.orderDir,
    });

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
    };

    if (dto.status) where.status = dto.status;
    if (dto.type) where.locationType = dto.type;
    if (dto.category) where.category = { contains: dto.category, mode: 'insensitive' };
    if (dto.city) where.city = { contains: dto.city, mode: 'insensitive' };
    if (dto.country) where.country = { contains: dto.country, mode: 'insensitive' };

    if (dto.startDate || dto.endDate) {
      where.startDate = {};
      if (dto.startDate) where.startDate.gte = dto.startDate;
      if (dto.endDate) where.startDate.lte = dto.endDate;
    }

    if (dto.tags) {
      const tagList = dto.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagList };
    }

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }

    // Free/paid filter (Discover toggle). Operates on the single ticketPrice
    // field — "free" matches null or 0, "paid" matches > 0.
    if (dto.price === 'paid') {
      where.ticketPrice = { gt: 0 };
    } else if (dto.price === 'free') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { OR: [{ ticketPrice: null }, { ticketPrice: 0 }] },
      ];
    }

    // "Events we both registered for" — drives the "Find at events" button
    // on a connection's card. Uses an AND of two `some` filters so an event
    // qualifies only when BOTH users have a non-cancelled registration row.
    if (dto.withUser && dto.viewerId) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { registrations: { some: { userId: dto.viewerId, status: { not: 'CANCELLED' } } } },
        { registrations: { some: { userId: dto.withUser, status: { not: 'CANCELLED' } } } },
      ];
    }

    const orderByField = dto.orderBy ?? 'startDate';
    const orderByDir = dto.orderDir ?? 'asc';

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: PUBLIC_ORGANIZER_SELECT },
          _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { [orderByField]: orderByDir },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events: events.map((e) => ({
        ...e,
        registeredCount: e._count.registrations,
        spotsLeft: Math.max(0, e.capacity - e._count.registrations),
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async registerForEvent(
    eventId: string,
    userId: string,
    answers?: Array<{ questionId: string; answer: string }>
  ) {
    // PENDING_APPROVAL doesn't occupy a slot until accepted, so it must be
    // excluded from the count along with CANCELLED.
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: 'PUBLISHED' },
      include: {
        _count: {
          select: {
            registrations: { where: { status: { notIn: ['CANCELLED', 'PENDING_APPROVAL'] } } },
          },
        },
      },
    });

    if (!event) throw new NotFoundError('Event');

    // Paid events must go through the payment flow. When Razorpay is configured
    // and the event has no free tier, block the free-registration path so a
    // ticket is never issued without payment. If payments aren't configured we
    // degrade gracefully and let registration through.
    if (paymentsConfigured() && !hasFreeOption(event)) {
      throw new BadRequestError(
        'This event requires a paid ticket. Please complete checkout to register.'
      );
    }

    const requiresApproval = event.requiresApproval;

    // Capacity guard. To prevent overselling under concurrent RSVPs we hold a
    // Postgres advisory lock for the event id while we check the count and
    // create the registration row; pg_advisory_xact_lock is released on COMMIT.
    if (event._count.registrations >= event.capacity && !requiresApproval) {
      // Add to waitlist instead — no capacity check needed, waitlist is unbounded.
      const registration = await prisma.eventRegistration.create({
        data: { eventId, userId, status: 'WAITLISTED' },
      });
      return { registration, message: 'You have been added to the waitlist' };
    }

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      if (existing.status === 'CANCELLED') {
        const newStatus = requiresApproval ? 'PENDING_APPROVAL' : 'REGISTERED';
        const updated = await prisma.eventRegistration.update({
          where: { id: existing.id },
          data: { status: newStatus },
        });
        return {
          registration: updated,
          message: requiresApproval
            ? 'Request re-submitted — awaiting approval'
            : 'Registration re-activated',
        };
      }
      throw new ConflictError('You are already registered for this event');
    }

    const initialStatus = requiresApproval ? 'PENDING_APPROVAL' : 'REGISTERED';
    // Hold a Postgres advisory transaction lock keyed on the event id so two
    // concurrent RSVPs at capacity-1 can't both see "spot available" and both
    // create. The lock is released when the transaction commits/rolls back.
    const registration = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`,
        eventId
      );
      const currentCount = await tx.eventRegistration.count({
        where: { eventId, status: { notIn: ['CANCELLED', 'PENDING_APPROVAL'] } },
      });
      if (!requiresApproval && currentCount >= event.capacity) {
        return tx.eventRegistration.create({
          data: { eventId, userId, status: 'WAITLISTED' },
        });
      }
      return tx.eventRegistration.create({
        data: { eventId, userId, status: initialStatus },
      });
    });

    // Persist answers if any. Required-question enforcement happens here so
    // the API stays REST-y (single POST, all data attached).
    if (answers && answers.length > 0) {
      const questions = await prisma.eventQuestion.findMany({
        where: { eventId, id: { in: answers.map((a) => a.questionId) } },
        select: { id: true, required: true },
      });
      const validIds = new Set(questions.map((q) => q.id));
      const required = await prisma.eventQuestion.findMany({
        where: { eventId, required: true },
        select: { id: true, prompt: true },
      });
      const answeredIds = new Set(
        answers.filter((a) => a.answer.trim() !== '').map((a) => a.questionId)
      );
      const missing = required.filter((q) => !answeredIds.has(q.id));
      if (missing.length > 0) {
        throw new BadRequestError(
          `Please answer required question${missing.length === 1 ? '' : 's'}: ${missing
            .map((m) => `"${m.prompt}"`)
            .join(', ')}`
        );
      }
      const valid = answers.filter((a) => validIds.has(a.questionId) && a.answer.trim());
      if (valid.length > 0) {
        await prisma.registrationAnswer.createMany({
          data: valid.map((a) => ({
            registrationId: registration.id,
            questionId: a.questionId,
            answer: a.answer.trim(),
          })),
          skipDuplicates: true,
        });
      }
    }

    if (requiresApproval) {
      // Notify the organizer there's a pending approval to review.
      notificationsService
        .createNotification(
          event.organizerId,
          'SYSTEM',
          'New registration awaiting approval',
          `Someone requested to attend "${event.title}".`,
          { eventId, registrationId: registration.id }
        )
        .catch(() => {});
      return {
        registration,
        message: 'Request submitted — the organizer will review shortly',
      };
    }

    // Add FK score
    await gamificationService
      .addScore(userId, 'EVENT_REGISTERED', SCORE_VALUES.EVENT_REGISTERED, { eventId })
      .catch(() => {});

    // Create lead for organizer
    await prisma.lead.upsert({
      where: { eventId_attendeeId: { eventId, attendeeId: userId } },
      update: {},
      create: {
        eventId,
        attendeeId: userId,
        organizerId: event.organizerId,
        status: 'NEW',
      },
    });

    // Fire registration confirmation email with QR ticket attachment.
    this.sendRegistrationConfirmation(registration.id).catch((err) =>
      logger.warn('Failed to send registration confirmation', {
        err,
        registrationId: registration.id,
      })
    );

    return { registration, message: 'Successfully registered for event' };
  }

  /**
   * Confirm a registration after a verified payment. Creates or re-activates the
   * registration as REGISTERED with payment metadata, awards score, creates the
   * organizer lead, and emails the QR ticket. Called by the payments module
   * after Razorpay signature verification.
   */
  async finalizePaidRegistration(args: {
    eventId: string;
    userId: string;
    amountPaid: number;
    ticketTierId?: string;
    ticketTierName?: string;
  }) {
    const { eventId, userId, amountPaid, ticketTierId, ticketTierName } = args;
    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundError('Event');

    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    const data = {
      status: 'REGISTERED' as const,
      amountPaid: new Prisma.Decimal(amountPaid),
      paymentStatus: 'PAID' as const,
      ticketTierId: ticketTierId ?? null,
      ticketTierName: ticketTierName ?? null,
    };

    const registration = existing
      ? await prisma.eventRegistration.update({ where: { id: existing.id }, data })
      : await prisma.eventRegistration.create({ data: { eventId, userId, ...data } });

    // Award score + lead once — skip if the user was already a confirmed attendee.
    const wasUnconfirmed =
      !existing ||
      existing.status === 'CANCELLED' ||
      existing.status === 'WAITLISTED' ||
      existing.status === 'PENDING_APPROVAL';
    if (wasUnconfirmed) {
      await gamificationService
        .addScore(userId, 'EVENT_REGISTERED', SCORE_VALUES.EVENT_REGISTERED, { eventId })
        .catch(() => {});
      await prisma.lead.upsert({
        where: { eventId_attendeeId: { eventId, attendeeId: userId } },
        update: {},
        create: { eventId, attendeeId: userId, organizerId: event.organizerId, status: 'NEW' },
      });
    }

    this.sendRegistrationConfirmation(registration.id).catch((err) =>
      logger.warn('Failed to send paid registration confirmation', {
        err,
        registrationId: registration.id,
      })
    );

    return registration;
  }

  /**
   * Called when an organizer approves a PENDING_APPROVAL registration. Awards
   * the registration score, creates the organizer lead, and emails the QR
   * ticket — the same perks a normal (non-curated) registration gets.
   */
  async onRegistrationApproved(registrationId: string): Promise<void> {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: { id: true, userId: true, eventId: true, event: { select: { organizerId: true } } },
    });
    if (!reg) return;

    await gamificationService
      .addScore(reg.userId, 'EVENT_REGISTERED', SCORE_VALUES.EVENT_REGISTERED, {
        eventId: reg.eventId,
      })
      .catch(() => {});
    await prisma.lead
      .upsert({
        where: { eventId_attendeeId: { eventId: reg.eventId, attendeeId: reg.userId } },
        update: {},
        create: {
          eventId: reg.eventId,
          attendeeId: reg.userId,
          organizerId: reg.event.organizerId,
          status: 'NEW',
        },
      })
      .catch(() => {});

    this.sendRegistrationConfirmation(reg.id).catch((err) =>
      logger.warn('Failed to send approval confirmation', { err, registrationId: reg.id })
    );
  }

  /** Build and enqueue the confirmation email with an attached QR ticket. */
  private async sendRegistrationConfirmation(registrationId: string): Promise<void> {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      include: {
        event: true,
        user: {
          include: { profile: { select: { firstName: true } } },
        },
      },
    });
    if (!reg) return;
    const qrModule = await import('@utils/qrcode');
    // Encode the registration id — organizer check-in scanner can resolve it.
    const qrPngBase64 = await qrModule.generateQrPng(`reg:${reg.id}`);
    const firstName = reg.user.profile?.firstName ?? 'there';
    const eventUrl = `${env.FRONTEND_URL}/e/${reg.event.id}`;
    const date = new Date(reg.event.startDate).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: reg.event.timezone ?? 'Asia/Kolkata',
    });
    const location =
      reg.event.locationType === 'VIRTUAL'
        ? (reg.event.meetingUrl ?? 'Online')
        : [reg.event.city, reg.event.country].filter(Boolean).join(', ') || 'TBD';
    const { addEmailJob } = await import('@jobs/email.queue');
    await addEmailJob('eventRegistrationConfirmation', {
      to: reg.user.email,
      name: firstName,
      eventTitle: reg.event.title,
      eventDate: date,
      eventLocation: location,
      eventUrl,
      qrPngBase64,
    });
  }

  /**
   * Luma-style guest RSVP — unauthenticated user registers with email + name.
   *
   * One email = one account: if a user already exists for this email we attach
   * the registration to them (regardless of how they originally signed up —
   * password, OTP, or Google). If no user exists, we create one silently with
   * no password set and email-verified=true (the confirmation email doubles
   * as proof of inbox ownership).
   *
   * Returns the existing or new user's id along with the registration so the
   * frontend can choose to drop the user straight into a session if desired.
   */
  async rsvpGuest(eventId: string, dto: RsvpGuestDto) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!event) throw new NotFoundError('Event');

    // Find-or-create the user by email.
    let user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Split the name into first + last on the first whitespace.
      const parts = dto.name.split(/\s+/);
      const firstName = parts[0] ?? dto.name;
      const lastName = parts.slice(1).join(' ') || firstName;

      user = await prisma.user.create({
        data: {
          email: dto.email,
          password: null,
          authProvider: 'guest-rsvp',
          isEmailVerified: true,
          role: 'ATTENDEE',
          profile: {
            create: { firstName, lastName },
          },
          gamification: { create: { fkScore: 0, level: 1 } },
        },
        include: { profile: true },
      });
    }

    if (!user.isActive || user.deletedAt) {
      throw new ForbiddenError('This account has been deactivated.');
    }

    // Idempotent guest RSVP: if this user is already registered for the
    // event, treat it as success rather than throwing. Two guests entering
    // the same email twice should both see "you're going" — not an error.
    let result;
    const alreadyRegistered = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (alreadyRegistered && alreadyRegistered.status !== 'CANCELLED') {
      result = {
        registration: alreadyRegistered,
        message: "You're already going to this event",
      };
    } else {
      result = await this.registerForEvent(eventId, user.id);
    }

    // Security: if this email already has a password set, the account is
    // "claimed" — don't auto-sign-in anyone who can guess the email.
    // They'll get the confirmation email and can sign in normally. New /
    // passwordless accounts (created here or via prior guest-RSVP) keep
    // the smooth Luma auto-sign-in flow.
    const hasPassword = !!user.password;

    // Fire-and-forget confirmation email.
    const eventUrl = `${env.FRONTEND_URL}/e/${eventId}`;
    sendEmail(
      user.email,
      `You're going to ${event.title}`,
      eventRsvpConfirmationEmail(user.profile?.firstName ?? dto.name, event.title, eventUrl)
    ).catch((err: Error) =>
      logger.error('Failed to send RSVP confirmation', { email: user.email, error: err.message })
    );

    // Auto-sign-in tokens removed — Supabase Auth handles session management.
    // Guests must sign in via Supabase (email/password or Google) to manage their registration.
    const tokens: null = null;
    let authUser: ReturnType<typeof buildAuthUser> | null = null;

    if (!hasPassword) {
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          founderCard: { select: { id: true, status: true, qrCodeUrl: true } },
          gamification: { select: { fkScore: true, level: true } },
        },
      });
      authUser = buildAuthUser(fullUser);
    }

    return {
      ...result,
      isNewUser,
      userEmail: user.email,
      user: authUser,
      tokens,
      requiresSignIn: hasPassword,
    };
  }

  async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const registration = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!registration) throw new NotFoundError('Registration');
    if (registration.status === 'CANCELLED') {
      throw new BadRequestError('Registration is already cancelled');
    }

    const wasRegistered =
      registration.status === 'REGISTERED' || registration.status === 'ATTENDED';

    // Cancel + promote oldest WAITLISTED in a single transaction. Uses
    // FOR UPDATE SKIP LOCKED so two concurrent cancellations can't double-promote.
    const promotedUserId: string | null = await prisma.$transaction(async (tx) => {
      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: { status: 'CANCELLED' },
      });

      if (!wasRegistered) return null;

      const rows = await tx.$queryRaw<Array<{ id: string; userId: string }>>`
        SELECT "id", "userId"
        FROM "event_registrations"
        WHERE "eventId" = ${eventId} AND "status" = 'WAITLISTED'
        ORDER BY "registeredAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      if (rows.length === 0) return null;
      await tx.eventRegistration.update({
        where: { id: rows[0].id },
        data: { status: 'REGISTERED' },
      });
      return rows[0].userId;
    });

    if (promotedUserId) {
      // Notify + email outside the transaction (network I/O can't run inside a
      // Prisma interactive transaction). The DB promotion is already committed,
      // so failures here are best-effort — we log them so they're visible.
      try {
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        const promotedUser = await prisma.user.findUnique({
          where: { id: promotedUserId },
          select: { email: true, profile: { select: { firstName: true } } },
        });
        if (event && promotedUser) {
          notificationsService
            .createNotification(
              promotedUserId,
              'SYSTEM',
              "You're off the waitlist!",
              `A spot just opened for "${event.title}" and you're now confirmed.`,
              { eventId }
            )
            .catch((err) =>
              logger.warn('Failed to notify waitlist-promoted user', { promotedUserId, err })
            );
          const { addEmailJob } = await import('@jobs/email.queue');
          const date = new Date(event.startDate).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: event.timezone ?? 'Asia/Kolkata',
          });
          await addEmailJob('waitlistPromoted', {
            to: promotedUser.email,
            name: promotedUser.profile?.firstName ?? 'there',
            eventTitle: event.title,
            eventDate: date,
            eventUrl: `${env.FRONTEND_URL}/e/${event.id}`,
          });
        }
      } catch (err) {
        logger.warn('Failed to notify waitlist-promoted user', { promotedUserId, err });
      }
    }

    // Notify the organizer that an attendee dropped (so they can follow up /
    // backfill). Best-effort; never blocks the cancel.
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true, title: true },
      });
      const attendee = await prisma.user.findUnique({
        where: { id: userId },
        select: { profile: { select: { firstName: true, lastName: true } } },
      });
      if (event) {
        const who = attendee?.profile
          ? `${attendee.profile.firstName} ${attendee.profile.lastName}`.trim()
          : 'An attendee';
        await notificationsService
          .createNotification(
            event.organizerId,
            'SYSTEM',
            'A registration was cancelled',
            `${who} cancelled their registration for "${event.title}".`,
            { eventId, userId }
          )
          .catch(() => {});
      }
    } catch (err) {
      logger.warn('Failed to notify organizer of cancellation', { eventId, err });
    }

    // Refund a paid ticket on cancellation (best-effort; Razorpay only).
    if (registration.paymentStatus === 'PAID') {
      try {
        const refunded = await paymentsService.refundForRegistration(registration.id);
        if (refunded) {
          await prisma.eventRegistration
            .update({ where: { id: registration.id }, data: { paymentStatus: 'REFUNDED' } })
            .catch(() => {});
        }
      } catch (err) {
        logger.warn('Failed to refund cancelled paid registration', {
          registrationId: registration.id,
          err,
        });
      }
    }
  }

  async getMyEvents(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { userId },
        include: {
          event: {
            include: {
              organizer: { select: PUBLIC_ORGANIZER_SELECT },
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.eventRegistration.count({ where: { userId } }),
    ]);

    return {
      registrations,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getOrganizerEvents(organizerId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: { organizerId, deletedAt: null },
        include: {
          _count: { select: { registrations: { where: { status: { not: 'CANCELLED' } } } } },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.count({ where: { organizerId, deletedAt: null } }),
    ]);

    return {
      events: events.map((e) => ({ ...e, registeredCount: e._count.registrations })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  async getEventAttendees(eventId: string, organizerId: string, page?: number, limit?: number) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');

    const pagination = parsePaginationQuery({ page, limit });

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId, status: { not: 'CANCELLED' } },
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
                  email: true,
                },
              },
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { registeredAt: 'desc' },
      }),
      prisma.eventRegistration.count({ where: { eventId, status: { not: 'CANCELLED' } } }),
    ]);

    return {
      attendees: registrations,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /** Public list of an event's custom registration questions. */
  async listEventQuestions(eventId: string) {
    return prisma.eventQuestion.findMany({
      where: { eventId },
      orderBy: { position: 'asc' },
    });
  }

  /** Public speaker bios + agenda — anyone viewing the event can see these. */
  async listSpeakers(eventId: string) {
    return prisma.eventSpeaker.findMany({
      where: { eventId },
      orderBy: { position: 'asc' },
    });
  }

  async listAgenda(eventId: string) {
    return prisma.eventAgendaItem.findMany({
      where: { eventId },
      include: {
        speaker: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  /** Toggle a saved-event bookmark for the user. Idempotent. */
  async toggleSave(eventId: string, userId: string, save: boolean) {
    if (save) {
      await prisma.savedEvent.upsert({
        where: { userId_eventId: { userId, eventId } },
        create: { userId, eventId },
        update: {},
      });
    } else {
      await prisma.savedEvent
        .delete({ where: { userId_eventId: { userId, eventId } } })
        .catch(() => {});
    }
    return { saved: save };
  }

  async listSavedEvents(userId: string, page?: number, limit?: number) {
    const pagination = parsePaginationQuery({ page, limit });
    // Filter out saves whose underlying event has been soft-deleted; the join
    // would otherwise leak deleted events into the user's saved list.
    const where = { userId, event: { deletedAt: null } } as const;
    const [rows, total] = await Promise.all([
      prisma.savedEvent.findMany({
        where,
        include: {
          event: {
            include: {
              organizer: { select: PUBLIC_ORGANIZER_SELECT },
              _count: { select: { registrations: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.savedEvent.count({ where }),
    ]);
    return {
      events: rows.map((s) => s.event),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /**
   * Lazily mint a check-in token on first request. Stable thereafter so
   * organizers can print posters with the same URL for the lifetime of the
   * event.
   */
  async getOrCreateCheckInToken(eventId: string, organizerId: string): Promise<string> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
      select: { id: true, checkInToken: true, endDate: true },
    });
    if (!event) throw new NotFoundError('Event');
    if (event.checkInToken) return event.checkInToken;

    const { randomShortToken } = await import('@utils/slug');
    const token = randomShortToken(9);
    // Token expires 6 hours after the event's scheduled end so it can't be
    // photographed and re-used at unrelated events months later.
    const expiresAt = new Date(event.endDate.getTime() + 6 * 60 * 60 * 1000);
    await prisma.event.update({
      where: { id: eventId },
      data: { checkInToken: token, checkInTokenExpiresAt: expiresAt },
    });
    return token;
  }

  /**
   * Self check-in — attendee scans the event's check-in poster QR. The token
   * is bearer (whoever has the URL can use it) BUT the writer is always the
   * authenticated user, so leakage means "anonymous person can mark
   * themselves checked in," not "anyone can check anyone in." Service
   * verifies the user is registered for the event.
   */
  async selfCheckIn(token: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { checkInToken: token },
      select: { id: true, title: true, status: true, deletedAt: true, checkInTokenExpiresAt: true },
    });
    if (!event || event.deletedAt) throw new NotFoundError('Event');
    if (event.status === 'CANCELLED') {
      throw new BadRequestError('This event has been cancelled');
    }
    if (event.checkInTokenExpiresAt && event.checkInTokenExpiresAt < new Date()) {
      throw new BadRequestError('This check-in link has expired');
    }

    const reg = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
    });
    if (!reg || reg.status === 'CANCELLED') {
      throw new ForbiddenError('You need to register for this event before checking in');
    }
    if (reg.checkedIn) {
      return { event, registration: reg, alreadyCheckedIn: true };
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: reg.id },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
        status: 'ATTENDED',
      },
    });

    await gamificationService
      .addScore(userId, 'EVENT_ATTENDED', SCORE_VALUES.EVENT_ATTENDED, {
        eventId: event.id,
      })
      .catch(() => {});

    return { event, registration: updated, alreadyCheckedIn: false };
  }

  /**
   * Attendee-facing event roster — visible only to people who are registered
   * for the event (or its organizer/admin). Returns minimal public-safe fields
   * plus eventRole so VIP/Speaker badges can be rendered on the frontend.
   */
  async listAttendeesForAttendee(
    eventId: string,
    viewerId: string,
    viewerRole: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN',
    page?: number,
    limit?: number
  ) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, organizerId: true, visibility: true },
    });
    if (!event) throw new NotFoundError('Event');

    const isOrganizer = event.organizerId === viewerId || viewerRole === 'ADMIN';
    if (!isOrganizer) {
      const reg = await prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId: viewerId } },
        select: { id: true, status: true },
      });
      if (!reg || reg.status === 'CANCELLED') {
        throw new ForbiddenError('Only registered attendees can see who else is attending');
      }
    }

    const pagination = parsePaginationQuery({ page, limit });

    const [registrations, total] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId, status: { not: 'CANCELLED' } },
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
              founderCard: { select: { id: true, status: true, publicSlug: true } },
              gamification: { select: { fkScore: true, level: true } },
            },
          },
        },
        // Sort role-rank first (VIP/Speaker before Attendee), then by checked-in
        // status, then by registration time. Postgres respects this ordering.
        orderBy: [{ eventRole: 'asc' }, { checkedIn: 'desc' }, { registeredAt: 'asc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.eventRegistration.count({ where: { eventId, status: { not: 'CANCELLED' } } }),
    ]);

    const attendees = registrations.map((r) => ({
      registrationId: r.id,
      userId: r.userId,
      eventRole: r.eventRole,
      checkedIn: r.checkedIn,
      checkedInAt: r.checkedInAt,
      registeredAt: r.registeredAt,
      user: {
        id: r.user.id,
        email: isOrganizer || r.userId === viewerId ? r.user.email : undefined,
        profile: r.user.profile,
        founderCard: r.user.founderCard,
        gamification: r.user.gamification,
      },
    }));

    return {
      attendees,
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }

  /**
   * Co-attendee suggestions ranked by skill / interest / lookingFor overlap.
   * Limit = 10. Excludes self, already-connected, and already-pending requests.
   */
  async getEventSuggestions(eventId: string, viewerId: string, limit = 10) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new NotFoundError('Event');

    const viewerReg = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: viewerId } },
      select: { id: true, status: true },
    });
    const isOrganizer = event.organizerId === viewerId;
    if ((!viewerReg || viewerReg.status === 'CANCELLED') && !isOrganizer) {
      throw new ForbiddenError('Suggestions are only available to registered attendees');
    }

    const viewerProfile = await prisma.profile.findUnique({
      where: { userId: viewerId },
      select: { skills: true, interests: true, lookingFor: true },
    });
    const skills = viewerProfile?.skills ?? [];
    const interests = viewerProfile?.interests ?? [];
    const lookingFor = viewerProfile?.lookingFor ?? [];

    const existing = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: viewerId }, { receiverId: viewerId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    // Hide anyone the viewer has blocked, or who has blocked the viewer.
    const blocks = await prisma.blockedUser.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    const exclude = new Set<string>([viewerId]);
    for (const c of existing) {
      exclude.add(c.requesterId);
      exclude.add(c.receiverId);
    }
    for (const b of blocks) {
      exclude.add(b.blockerId);
      exclude.add(b.blockedId);
    }

    const pool = await prisma.eventRegistration.findMany({
      where: {
        eventId,
        status: { not: 'CANCELLED' },
        userId: { notIn: Array.from(exclude) },
      },
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
                skills: true,
                interests: true,
                lookingFor: true,
              },
            },
            founderCard: { select: { status: true, publicSlug: true } },
            gamification: { select: { fkScore: true, level: true } },
          },
        },
      },
      take: 200,
    });

    const intersect = (a: string[], b: string[]) => a.filter((x) => b.includes(x)).length;

    const ranked = pool
      .map((r) => {
        const p = r.user.profile;
        const skillOverlap = p ? intersect(skills, p.skills ?? []) : 0;
        const interestOverlap = p ? intersect(interests, p.interests ?? []) : 0;
        // I'm looking-for x; they have skills x → high signal
        const lookingForMatchTheirSkills = p ? intersect(lookingFor, p.skills ?? []) : 0;
        const score = 2 * skillOverlap + 1.5 * interestOverlap + 3 * lookingForMatchTheirSkills;
        return { registration: r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map(({ registration: r, score }) => ({
      userId: r.userId,
      eventRole: r.eventRole,
      score,
      user: {
        id: r.user.id,
        profile: r.user.profile,
        founderCard: r.user.founderCard,
        gamification: r.user.gamification,
      },
    }));
  }

  async publishEvent(eventId: string, organizerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');
    if (event.status !== 'DRAFT') {
      throw new BadRequestError('Only draft events can be published');
    }

    return prisma.event.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED' },
    });
  }

  async cancelEvent(eventId: string, organizerId: string): Promise<void> {
    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) throw new NotFoundError('Event');
    if (event.status === 'CANCELLED') {
      throw new BadRequestError('Event is already cancelled');
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'CANCELLED' },
    });

    // All non-cancelled registrations (incl. paid + waitlist).
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      select: {
        id: true,
        userId: true,
        paymentStatus: true,
        user: { select: { email: true, profile: { select: { firstName: true } } } },
      },
    });

    const userIds = registrations.map((r) => r.userId);
    if (userIds.length > 0) {
      await notificationsService
        .sendBulkNotification(
          userIds,
          'SYSTEM',
          'Event Cancelled',
          `The event "${event.title}" has been cancelled.`,
          { eventId }
        )
        .catch(() => {});
    }

    // Email everyone + refund any paid tickets (best-effort, sequential to be
    // gentle on the Razorpay API).
    const { addEmailJob } = await import('@jobs/email.queue');
    const eventUrl = `${env.FRONTEND_URL}/e/${event.slug ?? event.id}`;
    for (const reg of registrations) {
      if (reg.user?.email) {
        addEmailJob('eventBlast', {
          to: reg.user.email,
          name: reg.user.profile?.firstName ?? 'there',
          subject: `Cancelled: ${event.title}`,
          bodyHtml: `<p>We're sorry — <strong>${event.title}</strong> has been cancelled by the organizer.</p>${reg.paymentStatus === 'PAID' ? '<p>Your ticket will be refunded to your original payment method.</p>' : ''}<p><a href="${eventUrl}">View event</a></p>`,
        }).catch(() => {});
      }
      if (reg.paymentStatus === 'PAID') {
        await paymentsService.refundForRegistration(reg.id).catch(() => {});
      }
    }
  }

  // Bot user-agent regex — matches the common crawlers without a dependency.
  private static BOT_UA =
    /bot|crawler|spider|crawling|preview|whatsapp|slackbot|twitterbot|facebookexternalhit|linkedinbot/i;

  /**
   * Record a public event-page view. Upserts on (eventId, sessionId) so repeat
   * loads from the same session are a no-op. Anonymous viewers are tracked by
   * session cookie; authed viewers also get userId. Bot UAs are flagged.
   */
  async trackPageView(
    eventId: string,
    opts: {
      sessionId?: string;
      userId?: string | null;
      ip?: string;
      userAgent?: string;
      referrer?: string;
    }
  ) {
    if (!opts.sessionId) return; // No session cookie → silently skip
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true },
    });
    if (!event) return;

    const ipHash = opts.ip
      ? crypto
          .createHash('sha256')
          .update(`${opts.ip}|${new Date().toISOString().slice(0, 10)}`)
          .digest('hex')
          .slice(0, 32)
      : null;
    const isBot = opts.userAgent ? EventsService.BOT_UA.test(opts.userAgent) : false;

    await prisma.eventPageView.upsert({
      where: { eventId_sessionId: { eventId, sessionId: opts.sessionId } },
      update: {
        userId: opts.userId ?? undefined,
        userAgent: opts.userAgent,
        referrer: opts.referrer,
      },
      create: {
        eventId,
        sessionId: opts.sessionId,
        userId: opts.userId ?? null,
        ipHash,
        userAgent: opts.userAgent,
        referrer: opts.referrer,
        isBot,
      },
    });
  }

  /** Visitor summary for organizers — total views + authed visitors who haven't registered. */
  async listVisitors(eventId: string, callerId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new NotFoundError('Event');
    const isCoorganizer =
      event.organizerId === callerId
        ? true
        : !!(await prisma.eventCoorganizer.findFirst({
            where: { eventId, userId: callerId },
            select: { id: true },
          }));
    if (!isCoorganizer) throw new ForbiddenError('You cannot view visitors for this event');

    const [totalViews, uniqueAuthed, anonViews] = await Promise.all([
      prisma.eventPageView.count({ where: { eventId, isBot: false } }),
      prisma.eventPageView.findMany({
        where: { eventId, isBot: false, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.eventPageView.count({ where: { eventId, isBot: false, userId: null } }),
    ]);

    const authedIds = uniqueAuthed.map((v) => v.userId!).filter(Boolean);
    const registeredIds = authedIds.length
      ? (
          await prisma.eventRegistration.findMany({
            where: { eventId, userId: { in: authedIds } },
            select: { userId: true },
          })
        ).map((r) => r.userId)
      : [];
    const registeredSet = new Set(registeredIds);

    const authedVisitors = authedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authedIds }, deletedAt: null, isActive: true },
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
        })
      : [];

    return {
      totalViews,
      uniqueAuthedVisitors: authedVisitors.length,
      uniqueAnonVisitors: anonViews,
      authedVisitors: authedVisitors.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        profile: u.profile,
        registered: registeredSet.has(u.id),
      })),
    };
  }
}

export default new EventsService();
