import { Router } from 'express';
import ambassadorsController from './ambassadors.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import {
  applyAmbassadorSchema,
  updateAmbassadorStatusSchema,
  shippingAddressSchema,
  dispatchRewardSchema,
} from './ambassadors.validation';

const router = Router();

// Public directory of active ambassadors (optionally ?city=).
router.get('/', ambassadorsController.listActive.bind(ambassadorsController));

// Signed-in applicant: apply + check own status.
router.post(
  '/apply',
  authenticate,
  validate(applyAmbassadorSchema),
  ambassadorsController.apply.bind(ambassadorsController)
);
router.get('/me', authenticate, ambassadorsController.getMine.bind(ambassadorsController));

// Signed-in ambassador: add/update the shipping address on one of their own reward rows.
router.patch(
  '/rewards/:id/shipping-address',
  authenticate,
  validate(shippingAddressSchema),
  ambassadorsController.submitShippingAddress.bind(ambassadorsController)
);

// Admin review queue.
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  ambassadorsController.adminList.bind(ambassadorsController)
);
router.patch(
  '/admin/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateAmbassadorStatusSchema),
  ambassadorsController.updateStatus.bind(ambassadorsController)
);

// Admin reward fulfillment queue.
router.get(
  '/admin/rewards',
  authenticate,
  authorize('ADMIN'),
  ambassadorsController.adminListRewards.bind(ambassadorsController)
);
router.patch(
  '/admin/rewards/:id/dispatch',
  authenticate,
  authorize('ADMIN'),
  validate(dispatchRewardSchema),
  ambassadorsController.dispatchReward.bind(ambassadorsController)
);
router.patch(
  '/admin/rewards/:id/delivered',
  authenticate,
  authorize('ADMIN'),
  ambassadorsController.markRewardDelivered.bind(ambassadorsController)
);

export default router;
