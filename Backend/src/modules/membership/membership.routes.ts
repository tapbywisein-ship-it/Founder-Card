import { Router } from 'express';
import membershipController from './membership.controller';
import { authenticate } from '@middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', membershipController.getMine.bind(membershipController));
router.post('/subscribe', membershipController.subscribe.bind(membershipController));
router.post('/verify', membershipController.verify.bind(membershipController));
router.post('/cancel', membershipController.cancel.bind(membershipController));

export default router;
