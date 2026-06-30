import { Request, Response } from 'express';
import publicService from './public.service';
import { sendSuccess } from '@utils/response';
import { BadRequestError } from '@utils/errors';

export class PublicController {
  async stats(_req: Request, res: Response): Promise<void> {
    const data = await publicService.getStats();
    res.setHeader('Cache-Control', 'public, max-age=300');
    sendSuccess(res, data, 'Public stats');
  }

  async demoRequest(req: Request, res: Response): Promise<void> {
    const { name, email, company, message } = req.body as Record<string, string>;
    if (!name?.trim() || !email?.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestError('Name and a valid email are required');
    }
    const data = await publicService.demoRequest({
      name: name.trim(),
      email: email.trim(),
      company,
      message,
    });
    sendSuccess(res, data, "Thanks! We'll be in touch shortly.");
  }
}

export default new PublicController();
