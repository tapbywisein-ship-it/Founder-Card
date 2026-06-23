import { Request, Response } from 'express';
import messagesService from './messages.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';

export class MessagesController {
  async listConversations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await messagesService.listConversations(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.conversations, result.pagination, 'Conversations retrieved');
  }

  async startConversation(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { targetUserId } = req.body as { targetUserId: string };
    const convo = await messagesService.getOrCreateConversation(userId, targetUserId);
    sendCreated(res, convo, 'Conversation ready');
  }

  async listMessages(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await messagesService.listMessages(
      id,
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.messages, result.pagination, 'Messages retrieved');
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { body } = req.body as { body: string };
    const message = await messagesService.sendMessage(id, userId, body);
    sendCreated(res, message, 'Message sent');
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const result = await messagesService.markAsRead(id, userId);
    sendSuccess(res, result, 'Marked as read');
  }

  async unreadCount(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const count = await messagesService.unreadCount(userId);
    sendSuccess(res, { count }, 'Unread count');
  }
}

export default new MessagesController();
