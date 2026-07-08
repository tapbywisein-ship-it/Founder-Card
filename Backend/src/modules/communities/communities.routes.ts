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
router.post('/:id/invite', authenticate, communitiesController.invite.bind(communitiesController));

// Feed — reads are public for public communities (viewer resolved when signed
// in, which private communities require); writes are member-gated in the service.
router.get('/:id/posts', optionalAuthenticate, communitiesController.listPosts.bind(communitiesController));
router.post('/:id/posts', authenticate, communitiesController.createPost.bind(communitiesController));
router.post('/:id/announce', authenticate, communitiesController.announce.bind(communitiesController));
router.delete('/:id/posts/:postId', authenticate, communitiesController.deletePost.bind(communitiesController));
router.get('/posts/:postId/comments', optionalAuthenticate, communitiesController.listComments.bind(communitiesController));
router.post('/posts/:postId/comments', authenticate, communitiesController.addComment.bind(communitiesController));
router.delete('/comments/:commentId', authenticate, communitiesController.deleteComment.bind(communitiesController));

export default router;
