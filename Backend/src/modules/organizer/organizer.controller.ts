import { Request, Response } from 'express';
import organizerService from './organizer.service';
import { sendSuccess, sendPaginated } from '@utils/response';
import razorpayRouteService, {
  type OnboardingInput,
} from '@modules/payments/razorpay-route.service';
import prisma from '@config/database';

export class OrganizerController {
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const stats = await organizerService.getDashboardStats(organizerId);
    sendSuccess(res, stats, 'Dashboard stats retrieved');
  }

  async getLeads(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { status, eventId, search, page, limit } = req.query as {
      status?: string;
      eventId?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await organizerService.getLeads(
      organizerId,
      { status, eventId, search },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.leads, result.pagination, 'Leads retrieved');
  }

  async updateLeadStatus(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { status, notes } = req.body as { status: string; notes?: string };
    const lead = await organizerService.updateLeadStatus(id, organizerId, status, notes);
    sendSuccess(res, lead, 'Lead updated');
  }

  async exportLeads(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { eventId } = req.query as { eventId?: string };
    const leads = await organizerService.exportLeads(organizerId, eventId);

    // Return as CSV-ready JSON
    sendSuccess(res, leads, 'Leads exported');
  }

  async getAttendeeDirectory(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { eventId, page, limit, search } = req.query as {
      eventId?: string;
      page?: string;
      limit?: string;
      search?: string;
    };

    const result = await organizerService.getAttendeeDirectory(
      organizerId,
      eventId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search
    );
    sendPaginated(res, result.attendees, result.pagination, 'Attendees retrieved');
  }

  async getEventAnalytics(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const analytics = await organizerService.getEventAnalytics(id, organizerId);
    sendSuccess(res, analytics, 'Event analytics retrieved');
  }

  async sendEventBlast(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const {
      subject,
      body,
      audience = 'all',
    } = req.body as {
      subject: string;
      body: string;
      audience?: 'all' | 'registered' | 'waitlist';
    };
    const result = await organizerService.sendEventBlast(id, organizerId, subject, body, audience);
    const msg =
      result.failed > 0
        ? `Blast sent to ${result.sent} of ${result.total} recipients (${result.failed} failed)`
        : `Blast sent to ${result.sent} recipients`;
    sendSuccess(res, result, msg);
  }

  async sendAttendeeBlast(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { userIds, subject, body } = req.body as {
      userIds: string[];
      subject: string;
      body: string;
    };
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'userIds must be a non-empty array' });
      return;
    }
    const result = await organizerService.sendAttendeeBlast(organizerId, userIds, subject, body);
    const msg =
      result.failed > 0
        ? `Email sent to ${result.sent} of ${result.total} attendees (${result.failed} failed)`
        : `Email sent to ${result.sent} attendees`;
    sendSuccess(res, result, msg);
  }

  async checkInAttendee(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { userId } = req.body as { userId: string };
    const registration = await organizerService.checkInAttendee(id, organizerId, userId);
    sendSuccess(res, registration, 'Attendee checked in');
  }

  async getEventGuests(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { page, limit, search, status } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
    };
    const result = await organizerService.getEventGuests(
      id,
      organizerId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      status
    );
    sendPaginated(res, result.guests, result.pagination, 'Guests retrieved');
  }

  async getNetworkingAnalytics(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.getNetworkingAnalytics(id, organizerId);
    sendSuccess(res, data, 'Networking analytics retrieved');
  }

  async getMatchmaking(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.getEventMatchmaking(id, organizerId);
    sendSuccess(res, data, 'Matchmaking suggestions retrieved');
  }

  async importAttendees(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const dryRun = String(req.query.dryRun ?? '0') === '1';
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'CSV file is required (field: file)' });
      return;
    }
    const result = await organizerService.importAttendeesCsv(id, organizerId, file.buffer, {
      dryRun,
    });
    sendSuccess(
      res,
      result,
      dryRun ? 'CSV preview' : `Imported ${result.summary.validRows} attendees`
    );
  }

  async listCoorganizers(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.listCoorganizers(id, callerId);
    sendSuccess(res, data, 'Co-hosts retrieved');
  }
  async addCoorganizer(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.addCoorganizer(id, callerId, req.body);
    sendSuccess(res, data, 'Co-host added');
  }
  async removeCoorganizer(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id, userId } = req.params as Record<string, string>;
    await organizerService.removeCoorganizer(id, callerId, userId);
    sendSuccess(res, null, 'Co-host removed');
  }

  async createSpeaker(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.createSpeaker(id, organizerId, req.body);
    sendSuccess(res, data, 'Speaker added');
  }
  async deleteSpeaker(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, speakerId } = req.params as Record<string, string>;
    await organizerService.deleteSpeaker(id, organizerId, speakerId);
    sendSuccess(res, null, 'Speaker removed');
  }
  async createAgendaItem(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.createAgendaItem(id, organizerId, req.body);
    sendSuccess(res, data, 'Agenda item added');
  }
  async deleteAgendaItem(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, itemId } = req.params as Record<string, string>;
    await organizerService.deleteAgendaItem(id, organizerId, itemId);
    sendSuccess(res, null, 'Agenda item removed');
  }

  async createEventQuestion(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.createQuestion(id, organizerId, req.body);
    sendSuccess(res, data, 'Question added');
  }

  async updateEventQuestion(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, questionId } = req.params as Record<string, string>;
    const data = await organizerService.updateQuestion(id, organizerId, questionId, req.body);
    sendSuccess(res, data, 'Question updated');
  }

  async deleteEventQuestion(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, questionId } = req.params as Record<string, string>;
    await organizerService.deleteQuestion(id, organizerId, questionId);
    sendSuccess(res, null, 'Question deleted');
  }

  async listPendingRegistrations(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await organizerService.listPendingRegistrations(id, organizerId);
    sendSuccess(res, data, 'Pending registrations retrieved');
  }

  async actionPendingRegistration(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, regId } = req.params as Record<string, string>;
    const { action } = req.body as { action: 'APPROVE' | 'DENY' };
    if (action !== 'APPROVE' && action !== 'DENY') {
      res.status(400).json({ success: false, message: 'action must be APPROVE or DENY' });
      return;
    }
    const data = await organizerService.actionPendingRegistration(id, organizerId, regId, action);
    sendSuccess(res, data, action === 'APPROVE' ? 'Registration approved' : 'Registration denied');
  }

  async refundAttendee(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id, userId } = req.params as Record<string, string>;
    const data = await organizerService.refundAttendee(id, userId, callerId);
    sendSuccess(res, data, 'Refund processed');
  }

  async setEventRole(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id, userId } = req.params as Record<string, string>;
    const { role } = req.body as { role?: string };
    const allowed = ['ATTENDEE', 'VIP', 'SPEAKER', 'STAFF', 'SPONSOR'] as const;
    if (!role || !allowed.includes(role as (typeof allowed)[number])) {
      res.status(400).json({ success: false, message: 'Invalid event role' });
      return;
    }
    const reg = await organizerService.setEventRole(
      id,
      organizerId,
      userId,
      role as (typeof allowed)[number]
    );
    sendSuccess(res, reg, 'Event role updated');
  }

  // ── Razorpay Route onboarding ──────────────────────────────────────────────

  async getRouteAccount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const account = await razorpayRouteService.getLinkedAccount(userId);

    // Also pull real-time earnings summary for the payouts page
    const payments = await prisma.payment.findMany({
      where: {
        event: { organizerId: userId },
        status: 'PAID',
      },
      select: {
        id: true,
        amount: true,
        platformFee: true,
        organizerEarning: true,
        transferStatus: true,
        transferAmount: true,
        transferredAt: true,
        createdAt: true,
        event: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarnings = payments.reduce((s, p) => s + Number(p.organizerEarning ?? 0), 0);
    const transferred = payments.reduce((s, p) => s + Number(p.transferAmount ?? 0), 0);
    const pending = payments
      .filter((p) => p.transferStatus === 'pending' || !p.transferStatus)
      .reduce((s, p) => s + Number(p.organizerEarning ?? 0), 0);
    const platformFee = payments.reduce((s, p) => s + Number(p.platformFee ?? 0), 0);

    // Group by event
    const byEvent: Record<
      string,
      { eventId: string; title: string; sales: number; gross: number; fee: number; earning: number }
    > = {};
    for (const p of payments) {
      const key = p.event.id;
      if (!byEvent[key])
        byEvent[key] = {
          eventId: key,
          title: p.event.title,
          sales: 0,
          gross: 0,
          fee: 0,
          earning: 0,
        };
      byEvent[key].sales += 1;
      byEvent[key].gross += Number(p.amount);
      byEvent[key].fee += Number(p.platformFee ?? 0);
      byEvent[key].earning += Number(p.organizerEarning ?? 0);
    }

    sendSuccess(
      res,
      {
        account,
        summary: {
          totalEarnings,
          transferred,
          pending,
          platformFee,
          events: Object.values(byEvent),
        },
        recentTransfers: payments.slice(0, 20),
      },
      'Payout account retrieved'
    );
  }

  async onboardRoute(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const input = req.body as OnboardingInput;
    const result = await razorpayRouteService.onboardOrganizer(userId, input);
    sendSuccess(res, result, 'Route account created — pending Razorpay KYC verification');
  }

  async refreshRouteStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const status = await razorpayRouteService.refreshAccountStatus(userId);
    sendSuccess(res, { status }, 'Account status refreshed');
  }

  async duplicateEvent(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const event = await organizerService.duplicateEvent(id, callerId);
    sendSuccess(res, event, 'Event duplicated', 201);
  }

  async exportAttendeesCsv(req: Request, res: Response): Promise<void> {
    const callerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const csv = await organizerService.exportAttendeesCsv(id, callerId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendees-${id}.csv"`);
    res.status(200).send(csv);
  }
}

export default new OrganizerController();
