import { Request, Response } from 'express';
import connectionsService from './connections.service';
import { sendSuccess, sendCreated, sendPaginated } from '@utils/response';
import { SendConnectionDto, RespondConnectionDto } from './connections.validation';

export class ConnectionsController {
  async sendRequest(req: Request, res: Response): Promise<void> {
    const requesterId = req.user!.userId;
    const dto = req.body as SendConnectionDto;
    const connection = await connectionsService.sendRequest(requesterId, dto.receiverId);
    sendCreated(res, connection, 'Connection request sent');
  }

  async respondToRequest(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const dto = req.body as RespondConnectionDto;
    const connection = await connectionsService.respondToRequest(id, userId, dto.action);
    sendSuccess(res, connection, `Connection request ${dto.action.toLowerCase()}ed`);
  }

  async removeConnection(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    await connectionsService.removeConnection(id, userId);
    sendSuccess(res, null, 'Connection removed');
  }

  async getConnections(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await connectionsService.getConnections(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.connections, result.pagination, 'Connections retrieved');
  }

  async getPendingRequests(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await connectionsService.getPendingRequests(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.requests, result.pagination, 'Pending requests retrieved');
  }

  async getSentRequests(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { page, limit } = req.query as { page?: string; limit?: string };
    const result = await connectionsService.getSentRequests(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );
    sendPaginated(res, result.requests, result.pagination, 'Sent requests retrieved');
  }

  async checkStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { targetId } = req.params as Record<string, string>;
    const status = await connectionsService.checkConnectionStatus(userId, targetId);
    sendSuccess(res, status, 'Connection status retrieved');
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { limit } = req.query as { limit?: string };
    const suggestions = await connectionsService.suggestConnections(
      userId,
      limit ? Number(limit) : 10
    );
    sendSuccess(res, suggestions, 'Connection suggestions retrieved');
  }

  async listNotes(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const notes = await connectionsService.listNotesForConnection(id, authorId);
    sendSuccess(res, notes, 'Notes retrieved');
  }

  async findBetween(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { targetId } = req.params as Record<string, string>;
    const data = await connectionsService.findConnectionBetween(userId, targetId);
    sendSuccess(res, data, 'Connection lookup');
  }

  async getContextWith(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { targetId } = req.params as Record<string, string>;
    const data = await connectionsService.getConnectionContext(userId, targetId);
    sendSuccess(res, data, 'Connection context');
  }

  async createNote(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { id } = req.params as Record<string, string>;
    const { body } = req.body as { body: string };
    const note = await connectionsService.createNote(id, authorId, body);
    sendSuccess(res, note, 'Note added');
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { noteId } = req.params as Record<string, string>;
    const { body } = req.body as { body: string };
    const note = await connectionsService.updateNote(noteId, authorId, body);
    sendSuccess(res, note, 'Note updated');
  }

  async deleteNote(req: Request, res: Response): Promise<void> {
    const authorId = req.user!.userId;
    const { noteId } = req.params as Record<string, string>;
    await connectionsService.deleteNote(noteId, authorId);
    sendSuccess(res, null, 'Note deleted');
  }

  async connectViaQR(req: Request, res: Response): Promise<void> {
    const scannerId = req.user!.userId;
    const body = req.body as {
      qrData?: string;
      slug?: string;
      targetUserId?: string;
      eventId?: string;
      method?: 'QR' | 'NFC' | 'MANUAL';
    };
    const result = await connectionsService.connectViaQR(scannerId, body);
    sendSuccess(res, result.connection, result.message);
  }
}

export default new ConnectionsController();
