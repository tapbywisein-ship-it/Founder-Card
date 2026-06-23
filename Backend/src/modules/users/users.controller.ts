import { Request, Response } from 'express';
import usersService from './users.service';
import founderCardsService from '@modules/founder-cards/founder-cards.service';
import blocksService from '@modules/blocks/blocks.service';
import { sendSuccess, sendPaginated } from '@utils/response';
import { UpdateProfileDto, SearchUsersDto } from './users.validation';
import { BadRequestError } from '@utils/errors';

export class UsersController {
  async getMyProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const profile = await usersService.getProfile(userId);
    sendSuccess(res, profile, 'Profile retrieved successfully');
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dto = req.body as UpdateProfileDto;
    const profile = await usersService.updateProfile(userId, dto);
    sendSuccess(res, profile, 'Profile updated successfully');
  }

  async updateAvatar(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    if (!req.file) {
      throw new BadRequestError('Avatar file is required');
    }

    if (!req.file.buffer) {
      throw new BadRequestError('File buffer is missing');
    }

    const result = await usersService.updateAvatar(userId, req.file.buffer, req.file.mimetype);
    sendSuccess(res, result, 'Avatar updated successfully');
  }

  async deleteAvatar(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await usersService.deleteAvatar(userId);
    sendSuccess(res, null, 'Avatar deleted successfully');
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    const currentUserId = req.user!.userId;
    const dto = req.query as SearchUsersDto;
    const result = await usersService.searchUsers(dto, currentUserId);
    sendPaginated(res, result.users, result.pagination, 'Users retrieved successfully');
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const user = await usersService.getUserById(id);
    sendSuccess(res, user, 'User retrieved successfully');
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const stats = await usersService.getUserStats(id);
    sendSuccess(res, stats, 'User stats retrieved successfully');
  }

  async usernameAvailable(req: Request, res: Response): Promise<void> {
    const requesterId = req.user?.userId;
    const u = (req.query.u as string | undefined) ?? '';
    const result = await usersService.checkUsernameAvailable(u, requesterId);
    sendSuccess(res, result, 'Username availability checked');
  }

  async claimUsername(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { username } = req.body as { username?: string };
    const updated = await usersService.claimUsername(userId, username ?? '');
    sendSuccess(res, updated, 'Username claimed');
  }

  /**
   * Marks onboarding complete and auto-issues the user's ACTIVE Founder Card
   * (with FK-XXXXX member ID). Idempotent — safe to call on every wizard finish.
   */
  async completeOnboarding(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const card = await founderCardsService.autoIssueCard(userId);
    sendSuccess(res, card, 'Onboarding complete — your Founder Card is ready');
  }

  async updatePayoutAccount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dto = req.body as Record<string, string>;
    const profile = await usersService.updatePayoutAccount(userId, dto);
    sendSuccess(res, profile, 'Payout account updated');
  }

  async blockUser(req: Request, res: Response): Promise<void> {
    const blockerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const result = await blocksService.blockUser(blockerId, id);
    sendSuccess(res, result, 'User blocked');
  }

  async unblockUser(req: Request, res: Response): Promise<void> {
    const blockerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const result = await blocksService.unblockUser(blockerId, id);
    sendSuccess(res, result, 'User unblocked');
  }

  async listBlocks(req: Request, res: Response): Promise<void> {
    const blockerId = req.user!.userId;
    const blocks = await blocksService.listBlocks(blockerId);
    sendSuccess(res, blocks, 'Blocked users retrieved');
  }
}

export default new UsersController();
