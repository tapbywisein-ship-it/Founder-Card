import { Router } from 'express';
import messagesController from './messages.controller';
import { authenticate } from '@middlewares/authenticate';
import { messagesLimiter } from '@middlewares/rateLimiter';

const router = Router();

router.use(authenticate, messagesLimiter);

router.get('/', messagesController.listConversations.bind(messagesController));
router.post('/', messagesController.startConversation.bind(messagesController));
router.get('/unread-count', messagesController.unreadCount.bind(messagesController));
router.get('/:id', messagesController.listMessages.bind(messagesController));
router.post('/:id/messages', messagesController.sendMessage.bind(messagesController));
router.post('/:id/read', messagesController.markAsRead.bind(messagesController));

export default router;
