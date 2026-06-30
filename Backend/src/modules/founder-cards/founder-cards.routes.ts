import { Router } from 'express';
import founderCardsController from './founder-cards.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import { applyCardSchema } from './founder-cards.validation';

const router = Router();

// Public routes — anyone with the slug, user id, or username can view the digital
// card. optionalAuthenticate lets us identify a logged-in viewer (for the
// "someone viewed your card" notification) without requiring auth.
router.get(
  '/public/slug/:slug',
  optionalAuthenticate,
  founderCardsController.getPublicCardBySlug.bind(founderCardsController)
);
router.get(
  '/public/user/:userId',
  optionalAuthenticate,
  founderCardsController.getPublicCardByUserId.bind(founderCardsController)
);
router.get(
  '/public/by-username/:username',
  optionalAuthenticate,
  founderCardsController.getPublicCardByUsername.bind(founderCardsController)
);

// Authenticated user routes
router.post(
  '/apply',
  authenticate,
  validate(applyCardSchema),
  founderCardsController.applyForCard.bind(founderCardsController)
);
router.get('/me', authenticate, founderCardsController.getMyCard.bind(founderCardsController));
router.get(
  '/me/analytics',
  authenticate,
  founderCardsController.getCardAnalytics.bind(founderCardsController)
);
router.get(
  '/me/blocks',
  authenticate,
  founderCardsController.listBlocks.bind(founderCardsController)
);
router.get(
  '/me/leads',
  authenticate,
  founderCardsController.listLeads.bind(founderCardsController)
);
// Public lead capture — anyone viewing a card can leave their details.
router.post(
  '/public/user/:userId/lead',
  founderCardsController.captureLead.bind(founderCardsController)
);
router.post(
  '/me/blocks',
  authenticate,
  founderCardsController.createBlock.bind(founderCardsController)
);
router.put(
  '/me/blocks/:blockId',
  authenticate,
  founderCardsController.updateBlock.bind(founderCardsController)
);
router.delete(
  '/me/blocks/:blockId',
  authenticate,
  founderCardsController.deleteBlock.bind(founderCardsController)
);
router.post('/me/qr', authenticate, founderCardsController.generateQR.bind(founderCardsController));
router.post(
  '/me/nfc',
  authenticate,
  founderCardsController.provisionNfc.bind(founderCardsController)
);
router.get(
  '/scan/:qrData',
  authenticate,
  founderCardsController.getCardByQR.bind(founderCardsController)
);

// Admin routes
router.get(
  '/pending',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.listPendingCards.bind(founderCardsController)
);
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.getAllCards.bind(founderCardsController)
);
router.post(
  '/:id/approve',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.approveCard.bind(founderCardsController)
);
router.post(
  '/:id/reject',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.rejectCard.bind(founderCardsController)
);
router.put(
  '/:id/deactivate',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.deactivateCard.bind(founderCardsController)
);
router.put(
  '/:id/reactivate',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.reactivateCard.bind(founderCardsController)
);
router.post(
  '/:id/nfc',
  authenticate,
  authorize('ADMIN'),
  founderCardsController.adminProvisionNfc.bind(founderCardsController)
);

export default router;
