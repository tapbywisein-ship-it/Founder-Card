import { Router } from 'express';
import payoutsController from './payouts.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';

const router = Router();

// Organizer earnings dashboard.
router.get('/me', authenticate, payoutsController.mySummary.bind(payoutsController));

// Admin settlement management.
router.get('/admin', authenticate, authorize('ADMIN'), payoutsController.adminList.bind(payoutsController));
router.post('/admin/settle', authenticate, authorize('ADMIN'), payoutsController.settle.bind(payoutsController));

export default router;
