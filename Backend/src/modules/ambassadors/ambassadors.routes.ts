import { Router } from 'express';
import ambassadorsController from './ambassadors.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { applyAmbassadorSchema, updateAmbassadorStatusSchema } from './ambassadors.validation';

const router = Router();

// Public directory of active ambassadors (optionally ?city=).
router.get('/', ambassadorsController.listActive.bind(ambassadorsController));

// Signed-in applicant: apply + check own status.
router.post('/apply', authenticate, validate(applyAmbassadorSchema), ambassadorsController.apply.bind(ambassadorsController));
router.get('/me', authenticate, ambassadorsController.getMine.bind(ambassadorsController));

// Admin review queue.
router.get('/admin', authenticate, authorize('ADMIN'), ambassadorsController.adminList.bind(ambassadorsController));
router.patch(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateAmbassadorStatusSchema),
  ambassadorsController.updateStatus.bind(ambassadorsController)
);

export default router;
