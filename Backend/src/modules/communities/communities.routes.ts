import { Router } from 'express';
import communitiesController from './communities.controller';
import { authenticate, optionalAuthenticate } from '@middlewares/authenticate';

const router = Router();

// Public — browse/discover public communities (membership resolved if signed in)
router.get('/', optionalAuthenticate, communitiesController.listPublic.bind(communitiesController));
// Public — community page (viewer membership resolved if signed in)
router.get('/slug/:slug', optionalAuthenticate, communitiesController.getBySlug.bind(communitiesController));

// Authenticated
router.post('/', authenticate, communitiesController.create.bind(communitiesController));
router.get('/mine', authenticate, communitiesController.listMine.bind(communitiesController));
router.get('/following', authenticate, communitiesController.listFollowing.bind(communitiesController));
router.patch('/:id', authenticate, communitiesController.update.bind(communitiesController));
router.post('/:id/join', authenticate, communitiesController.join.bind(communitiesController));
router.delete('/:id/join', authenticate, communitiesController.leave.bind(communitiesController));

export default router;
