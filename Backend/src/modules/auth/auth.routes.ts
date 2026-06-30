import { Router } from 'express';
import authController from './auth.controller';
import { authenticate } from '@middlewares/authenticate';
import { validate } from '@middlewares/validate';
import { authLimiter } from '@middlewares/rateLimiter';
import { claimAccountSchema } from './auth.validation';

const router = Router();

router.get('/me', authenticate, authController.getMe.bind(authController));

// Magic-link claim flow for CSV-imported invitees
router.get('/claim/:token', authController.validateClaim.bind(authController));
router.post(
  '/claim/:token',
  authLimiter,
  validate(claimAccountSchema),
  authController.claimAccount.bind(authController)
);

export default router;
