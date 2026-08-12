import { Request, Response } from 'express';
import eventsService from './events.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
import { CreateEventDto, UpdateEventDto, SearchEventsDto, RsvpGuestDto } from './events.validation';

export class EventsController {
  async createEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const dto = req.body as CreateEventDto;
    const event = await eventsService.createEvent(organizerId, dto);
    sendCreated(res, event, 'Event created successfully');
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const dto = req.body as UpdateEventDto;
    const event = await eventsService.updateEvent(id, organizerId, dto);
    sendSuccess(res, event, 'Event updated successfully');
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    await eventsService.deleteEvent(id, organizerId);
    sendSuccess(res, null, 'Event deleted successfully');
  }

  async getEvent(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const userId = req.user?.userId;
    const event = await eventsService.getEvent(id, userId);
    sendSuccess(res, event, 'Event retrieved successfully');
  }

  /** "Add to calendar" — serves the event as a downloadable .ics file. */
  async getEventCalendar(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const ics = await eventsService.getEventCalendar(id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="event.ics"');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(ics);
  }

  /** Attendee post-event feedback (rating 1–5, optional NPS 0–10 + comment). */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { rating, nps, comment } = req.body as { rating: number; nps?: number; comment?: string };
    const feedback = await eventsService.submitFeedback(id, userId, { rating, nps, comment });
    sendSuccess(res, feedback, 'Feedback saved');
  }

  async getMyFeedback(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const feedback = await eventsService.getMyFeedback(id, userId);
    sendSuccess(res, feedback, 'Feedback retrieved');
  }

  /** Organizer-only aggregate: count, avg rating, NPS, comments. */
  async getFeedbackSummary(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const summary = await eventsService.getFeedbackSummary(id, organizerId);
    sendSuccess(res, summary, 'Feedback summary retrieved');
  }

  /** Clone an event into a fresh DRAFT (run a meetup again). */
  async duplicateEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const copy = await eventsService.duplicateEvent(id, organizerId);
    sendCreated(res, copy, 'Event duplicated as draft');
  }

  async listEvents(req: Request, res: Response): Promise<void> {
    // Spread the validated query, then overwrite viewerId with the JWT-resolved
    // user. Prevents a caller from forging viewerId to peek at someone else's
    // registrations.
    const dto: SearchEventsDto = {
      ...(req.query as SearchEventsDto),
      viewerId: req.user?.userId,
    };
    const result = await eventsService.listEvents(dto);
    sendPaginated(res, result.events, result.pagination, 'Events retrieved successfully');
  }

  async registerForEvent(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { answers, referralCode } =
      (req.body as {
        answers?: Array<{ questionId: string; answer: string }>;
        referralCode?: string;
      }) ?? {};
    const result = await eventsService.registerForEvent(id, userId, answers, referralCode);
    sendSuccess(res, result.registration, result.message);
  }

  async listQuestions(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const data = await eventsService.listEventQuestions(id);
    sendSuccess(res, data, 'Questions retrieved');
  }

  async listSpeakers(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const data = await eventsService.listSpeakers(id);
    sendSuccess(res, data, 'Speakers retrieved');
  }

  async listAgenda(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const data = await eventsService.listAgenda(id);
    sendSuccess(res, data, 'Agenda retrieved');
  }

  async getImpactReport(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const data = await eventsService.getEventImpactReport(id);
    sendSuccess(res, data, 'Impact report retrieved');
  }

  async validateCoupon(req: Request, res: Response): Promise<void> {
    const { id, code } = req.params as Record<string, string>;
    const data = await eventsService.validateCoupon(id, code);
    sendSuccess(res, data, 'Coupon valid');
  }

  async rsvpGuest(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const dto = req.body as RsvpGuestDto;
    const result = await eventsService.rsvpGuest(id, dto);

    sendSuccess(res, result, result.message);
  }

  async cancelRegistration(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    await eventsService.cancelRegistration(id, userId);
    sendSuccess(res, null, 'Registration cancelled successfully');
  }

  async getMyEvents(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await eventsService.getMyEvents(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.registrations, result.pagination, 'Events retrieved successfully');
  }

  async getOrganizerEvents(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await eventsService.getOrganizerEvents(
      organizerId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.events, result.pagination, 'Events retrieved successfully');
  }

  async getEventAttendees(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await eventsService.getEventAttendees(
      id,
      organizerId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.attendees, result.pagination, 'Attendees retrieved successfully');
  }

  async publishEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const event = await eventsService.publishEvent(id, organizerId);
    sendSuccess(res, event, 'Event published successfully');
  }

  async cancelEvent(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    await eventsService.cancelEvent(id, organizerId);
    sendSuccess(res, null, 'Event cancelled successfully');
  }

  async listAttendeesForAttendee(req: Request, res: Response): Promise<void> {
    const viewerId = req.user!.userId;
    const viewerRole = req.user!.role as 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
    const { id } = req.params as Record<string, string>;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await eventsService.listAttendeesForAttendee(
      id,
      viewerId,
      viewerRole,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.attendees, result.pagination, 'Attendees retrieved successfully');
  }

  async toggleSave(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const save = req.method === 'POST';
    const result = await eventsService.toggleSave(id, userId, save);
    sendSuccess(res, result, save ? 'Event saved' : 'Event unsaved');
  }

  async listSaved(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await eventsService.listSavedEvents(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.events, result.pagination, 'Saved events retrieved');
  }

  async getCheckInToken(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const token = await eventsService.getOrCreateCheckInToken(id, organizerId);
    sendSuccess(res, { token, eventId: id }, 'Check-in token retrieved');
  }

  async selfCheckIn(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { token } = req.params as Record<string, string>;
    const result = await eventsService.selfCheckIn(token, userId);
    sendSuccess(res, result, result.alreadyCheckedIn ? "You're already checked in" : 'Checked in!');
  }

  async getEventSuggestions(req: Request, res: Response): Promise<void> {
    const viewerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { limit } = req.query as { limit?: string };
    const data = await eventsService.getEventSuggestions(id, viewerId, limit ? Number(limit) : 10);
    sendSuccess(res, data, 'Event suggestions retrieved');
  }

  async trackPageView(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    await eventsService.trackPageView(id, {
      sessionId: req.sessionId,
      userId: req.user?.userId ?? null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer ?? (req.headers.referrer as string | undefined),
    });
    res.status(204).end();
  }

  async listVisitors(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await eventsService.listVisitors(id, callerId);
    sendSuccess(res, data, 'Visitors retrieved');
  }
}

export default new EventsController();
