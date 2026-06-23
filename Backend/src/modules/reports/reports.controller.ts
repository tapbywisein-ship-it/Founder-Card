import { Request, Response } from 'express';
import reportsService from './reports.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
import { FileReportDto, ActionReportDto } from './reports.validation';

export class ReportsController {
  async fileReport(req: Request, res: Response): Promise<void> {
    const reporterId = req.user!.userId;
    const dto = req.body as FileReportDto;
    const report = await reportsService.fileReport(reporterId, dto);
    sendCreated(res, report, 'Report submitted — thanks for flagging');
  }

  async listReports(req: Request, res: Response): Promise<void> {
    const { status, page, limit } = req.query as {
      status?: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
      page?: string;
      limit?: string;
    };
    const result = await reportsService.listReports(
      { status },
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.reports, result.pagination, 'Reports retrieved');
  }

  async actionReport(req: Request, res: Response): Promise<void> {
    const reviewerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const dto = req.body as ActionReportDto;
    const report = await reportsService.actionReport(id, reviewerId, dto);
    sendSuccess(res, report, 'Report actioned');
  }
}

export default new ReportsController();
