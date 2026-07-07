import { Request, Response } from 'express';
import communitiesService from './communities.service';
import { sendSuccess } from '@utils/response';
import { createCommunitySchema, updateCommunitySchema } from './communities.validation';

export class CommunitiesController {
  async create(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const dto = createCommunitySchema.parse(req.body);
    const community = await communitiesService.create(organizerId, dto);
    sendSuccess(res, community, 'Community created', 201);
  }

  async update(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const dto = updateCommunitySchema.parse(req.body);
    const community = await communitiesService.update(id, organizerId, dto);
    sendSuccess(res, community, 'Community updated');
  }

  /** Public browse/discover list — attendees find communities to join. */
  async listPublic(req: Request, res: Response): Promise<void> {
    const viewerId = req.user?.userId;
    const { q, category } = req.query as { q?: string; category?: string };
    const data = await communitiesService.listPublic(viewerId, q, category);
    sendSuccess(res, data, 'Communities retrieved');
  }

  async listMine(req: Request, res: Response): Promise<void> {
    const organizerId = req.user!.userId;
    const data = await communitiesService.listMine(organizerId);
    sendSuccess(res, data, 'Communities retrieved');
  }

  async listFollowing(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = await communitiesService.listFollowing(userId);
    sendSuccess(res, data, 'Followed communities retrieved');
  }

  async getBySlug(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as Record<string, string>;
    const data = await communitiesService.getBySlug(slug, req.user?.userId);
    sendSuccess(res, data, 'Community retrieved');
  }

  async join(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await communitiesService.join(id, userId);
    sendSuccess(res, data, 'Joined community');
  }

  async leave(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const data = await communitiesService.leave(id, userId);
    sendSuccess(res, data, 'Left community');
  }
}

export default new CommunitiesController();
