import { Request, Response } from 'express';
import ambassadorsService from './ambassadors.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
import { ApplyAmbassadorDto, UpdateAmbassadorStatusDto } from './ambassadors.validation';

export class AmbassadorsController {
  async apply(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dto = req.body as ApplyAmbassadorDto;
    const app = await ambassadorsService.apply(userId, dto);
    sendCreated(res, app, 'Application submitted');
  }

  async getMine(req: Request, res: Response): Promise<void> {
    const app = await ambassadorsService.getMine(req.user!.userId);
    sendSuccess(res, app, 'Your ambassador status');
  }

  async listActive(req: Request, res: Response): Promise<void> {
    const { city } = req.query as { city?: string };
    const rows = await ambassadorsService.listActive(city);
    sendSuccess(res, rows, 'Ambassadors');
  }

  async adminList(req: Request, res: Response): Promise<void> {
    const { status, page, limit } = req.query as { status?: string; page?: string; limit?: string };
    const result = await ambassadorsService.adminList(
      status,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.ambassadors, result.pagination, 'Ambassador applications');
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const dto = req.body as UpdateAmbassadorStatusDto;
    const app = await ambassadorsService.updateStatus(id, req.user!.userId, dto);
    sendSuccess(res, app, 'Status updated');
  }
}

export default new AmbassadorsController();
