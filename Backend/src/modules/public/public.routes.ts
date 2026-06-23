import { Router } from 'express';
import publicController from './public.controller';

const router = Router();

// Public, unauthenticated.
router.get('/stats', publicController.stats.bind(publicController));
router.post('/demo-request', publicController.demoRequest.bind(publicController));

export default router;
