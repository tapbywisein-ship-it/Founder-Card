import { Request, Response } from 'express';
import payoutsService from './payouts.service';
import { sendSuccess } from '@utils/response';

export class PayoutsController {
  /** Organizer's own earnings/pending/settled summary. */
  async mySummary(req: Request, res: Response): Promise<void> {
    const data = await payoutsService.getOrganizerSummary(req.user!.userId);
    sendSuccess(res, data, 'Payout summary retrieved');
  }

  /** Admin: per-organizer pending vs settled + recent settlements. */
  async adminList(_req: Request, res: Response): Promise<void> {
    const data = await payoutsService.listAdminPayouts();
    sendSuccess(res, data, 'Payouts retrieved');
  }

  /** Admin: record a settlement (marks an amount paid to an organizer). */
  async settle(req: Request, res: Response): Promise<void> {
    const { organizerId, amount, reference, note } = req.body as {
      organizerId: string;
      amount: number;
      reference?: string;
      note?: string;
    };
    const data = await payoutsService.settle(organizerId, Number(amount), reference, note);
    sendSuccess(res, data, 'Payout recorded');
  }
}

export default new PayoutsController();
