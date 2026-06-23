import { Router } from 'express';
import reportsController from './reports.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { fileReportSchema, actionReportSchema } from './reports.validation';

const router = Router();

// Any authenticated user can file a report
router.post(
  '/',
  authenticate,
  validate(fileReportSchema),
  reportsController.fileReport.bind(reportsController)
);

// Admin moderation queue
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  reportsController.listReports.bind(reportsController)
);
router.patch(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  validate(actionReportSchema),
  reportsController.actionReport.bind(reportsController)
);

export default router;
