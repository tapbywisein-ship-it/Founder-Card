import { Router } from 'express';
import usersController from './users.controller';
import { authenticate } from '@middlewares/authenticate';
import { validate } from '@middlewares/validate';
import { uploadSingle } from '@middlewares/upload';
import { updateProfileSchema, searchUsersSchema } from './users.validation';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my profile
 */
router.get('/me', authenticate, usersController.getMyProfile.bind(usersController));

/**
 * @openapi
 * /users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update my profile
 */
router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  usersController.updateProfile.bind(usersController)
);

/**
 * @openapi
 * /users/me/avatar:
 *   put:
 *     tags: [Users]
 *     summary: Upload/update avatar
 */
router.put(
  '/me/avatar',
  authenticate,
  uploadSingle('avatar'),
  usersController.updateAvatar.bind(usersController)
);

/**
 * @openapi
 * /users/me/avatar:
 *   delete:
 *     tags: [Users]
 *     summary: Delete avatar
 */
router.delete('/me/avatar', authenticate, usersController.deleteAvatar.bind(usersController));

/**
 * @openapi
 * /users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users
 */
router.get(
  '/search',
  authenticate,
  validate(searchUsersSchema, 'query'),
  usersController.searchUsers.bind(usersController)
);

/**
 * @openapi
 * /users/username-available:
 *   get:
 *     tags: [Users]
 *     summary: Check whether a username is available
 */
router.get(
  '/username-available',
  authenticate,
  usersController.usernameAvailable.bind(usersController)
);

/**
 * @openapi
 * /users/me/username:
 *   put:
 *     tags: [Users]
 *     summary: Claim or update my username
 */
router.put(
  '/me/username',
  authenticate,
  usersController.claimUsername.bind(usersController)
);

/**
 * @openapi
 * /users/me/complete-onboarding:
 *   post:
 *     tags: [Users]
 *     summary: Finish onboarding and auto-issue the Founder Card
 */
router.post(
  '/me/complete-onboarding',
  authenticate,
  usersController.completeOnboarding.bind(usersController)
);

/**
 * @openapi
 * /users/me/blocks:
 *   get:
 *     tags: [Users]
 *     summary: List users I have blocked
 */
router.get('/me/blocks', authenticate, usersController.listBlocks.bind(usersController));

/**
 * @openapi
 * /users/me/payout-account:
 *   put:
 *     tags: [Users]
 *     summary: Update organizer payout account (UPI / bank)
 */
router.put('/me/payout-account', authenticate, usersController.updatePayoutAccount.bind(usersController));

/**
 * @openapi
 * /users/{id}/block:
 *   post:
 *     tags: [Users]
 *     summary: Block a user
 *   delete:
 *     tags: [Users]
 *     summary: Unblock a user
 */
router.post('/:id/block', authenticate, usersController.blockUser.bind(usersController));
router.delete('/:id/block', authenticate, usersController.unblockUser.bind(usersController));

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 */
router.get('/:id', authenticate, usersController.getUserById.bind(usersController));

/**
 * @openapi
 * /users/{id}/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user stats
 */
router.get('/:id/stats', authenticate, usersController.getUserStats.bind(usersController));

export default router;
