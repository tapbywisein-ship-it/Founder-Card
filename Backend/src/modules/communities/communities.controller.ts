import { Request, Response } from 'express';
import communitiesService from './communities.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
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

  async invite(req: Request, res: Response): Promise<void> {
    const inviterId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { userIds } = req.body as { userIds?: string[] };
    const data = await communitiesService.invite(id, inviterId, Array.isArray(userIds) ? userIds : []);
    sendSuccess(res, data, 'Invites sent');
  }

  // ── Feed: posts, comments, announcements ────────────────────────────────────

  async listPosts(req: Request, res: Response): Promise<void> {
    const { id } = req.params as Record<string, string>;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await communitiesService.listPosts(
      id,
      req.user?.userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.posts, result.pagination, 'Posts retrieved');
  }

  async createPost(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { body, imageUrl, pinned } = req.body as { body: string; imageUrl?: string; pinned?: boolean };
    const post = await communitiesService.createPost(id, authorId, { body, imageUrl, pinned });
    sendCreated(res, post, 'Post created');
  }

  async announce(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { body } = req.body as { body: string };
    const post = await communitiesService.announce(id, authorId, body);
    sendCreated(res, post, 'Announcement posted');
  }

  async deletePost(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id, postId } = req.params as Record<string, string>;
    await communitiesService.deletePost(id, postId, userId);
    sendSuccess(res, null, 'Post deleted');
  }

  async listComments(req: Request, res: Response): Promise<void> {
    const { postId } = req.params as Record<string, string>;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await communitiesService.listComments(
      postId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.comments, result.pagination, 'Comments retrieved');
  }

  async addComment(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { postId } = req.params as Record<string, string>;
    const { body } = req.body as { body: string };
    const comment = await communitiesService.addComment(postId, authorId, body);
    sendCreated(res, comment, 'Comment added');
  }

  async deleteComment(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { commentId } = req.params as Record<string, string>;
    await communitiesService.deleteComment(commentId, userId);
    sendSuccess(res, null, 'Comment deleted');
  }
}

export default new CommunitiesController();
