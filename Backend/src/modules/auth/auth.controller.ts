import { Request, Response } from 'express';
import authService from './auth.service';
import { sendSuccess } from '@utils/response';

export class AuthController {
  async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const user = await authService.getMe(userId);
    sendSuccess(res, user, 'User retrieved successfully');
  }

  async validateClaim(req: Request, res: Response): Promise<void> {
    const { token } = req.params as Record<string, string>;
    const data = await authService.validateClaimToken(token);
    sendSuccess(res, data, 'Claim token valid');
  }

  async claimAccount(req: Request, res: Response): Promise<void> {
    const { token } = req.params as Record<string, string>;
    const { password } = req.body as { password: string };
    const result = await authService.claimAccount(token, password);
    sendSuccess(res, result, 'Account claimed successfully. Sign in to continue.');
  }
}

export default new AuthController();
