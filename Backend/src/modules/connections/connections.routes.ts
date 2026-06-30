import { Router } from 'express';
import connectionsController from './connections.controller';
import { authenticate } from '@middlewares/authenticate';
import { validate } from '@middlewares/validate';
import {
  sendConnectionSchema,
  respondConnectionSchema,
  scanQRSchema,
} from './connections.validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', connectionsController.getConnections.bind(connectionsController));
router.get('/pending', connectionsController.getPendingRequests.bind(connectionsController));
router.get('/sent', connectionsController.getSentRequests.bind(connectionsController));
router.get('/suggestions', connectionsController.getSuggestions.bind(connectionsController));
router.get('/follow-ups', connectionsController.getFollowUps.bind(connectionsController));
router.get('/network-search', connectionsController.searchNetwork.bind(connectionsController));
router.get('/status/:targetId', connectionsController.checkStatus.bind(connectionsController));
router.get('/with/:targetId', connectionsController.findBetween.bind(connectionsController));
router.get(
  '/with/:targetId/context',
  connectionsController.getContextWith.bind(connectionsController)
);

// Phase 5.3 — Private notes per connection
router.get('/:id/notes', connectionsController.listNotes.bind(connectionsController));
router.post('/:id/notes', connectionsController.createNote.bind(connectionsController));
router.patch('/notes/:noteId', connectionsController.updateNote.bind(connectionsController));
router.delete('/notes/:noteId', connectionsController.deleteNote.bind(connectionsController));

// Per-user CRM metadata — private tags + follow-up reminder.
router.get('/:id/meta', connectionsController.getMeta.bind(connectionsController));
router.put('/:id/meta', connectionsController.setMeta.bind(connectionsController));

router.post(
  '/request',
  validate(sendConnectionSchema),
  connectionsController.sendRequest.bind(connectionsController)
);
router.post(
  '/qr-scan',
  validate(scanQRSchema),
  connectionsController.connectViaQR.bind(connectionsController)
);

router.put(
  '/:id/respond',
  validate(respondConnectionSchema),
  connectionsController.respondToRequest.bind(connectionsController)
);
router.delete('/:id', connectionsController.removeConnection.bind(connectionsController));

export default router;
