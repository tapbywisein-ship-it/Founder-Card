import { Router } from 'express';
import paymentsController from './payments.controller';
import { authenticate } from '@middlewares/authenticate';
import { validate } from '@middlewares/validate';
import { createOrderSchema, verifyPaymentSchema } from './payments.validation';

const router = Router();

// Public: tells the frontend whether paid checkout is available.
router.get('/config', paymentsController.config.bind(paymentsController));

// Razorpay server-to-server webhook (no auth; verified by signature).
router.post('/webhook', paymentsController.webhook.bind(paymentsController));

// Authenticated checkout flow.
router.post(
  '/orders',
  authenticate,
  validate(createOrderSchema),
  paymentsController.createOrder.bind(paymentsController)
);
router.post(
  '/verify',
  authenticate,
  validate(verifyPaymentSchema),
  paymentsController.verify.bind(paymentsController)
);

// Printable HTML invoice for a paid registration.
router.get('/:registrationId/invoice', authenticate, paymentsController.invoice.bind(paymentsController));

export default router;
