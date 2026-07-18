import { Request, Response } from 'express';
import membershipService, { type PlanKey } from './membership.service';
import { sendSuccess } from '@utils/response';
import { BadRequestError } from '@utils/errors';

const PLAN_KEYS: PlanKey[] = ['pro_monthly', 'pro_yearly', 'org_lite', 'org_pro'];

export class MembershipController {
  async getMine(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = await membershipService.getMyMembership(userId);
    sendSuccess(res, data, 'Membership retrieved');
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { plan } = req.body as { plan?: string };
    if (!plan || !PLAN_KEYS.includes(plan as PlanKey)) {
      throw new BadRequestError(`plan must be one of: ${PLAN_KEYS.join(', ')}`);
    }
    const data = await membershipService.createSubscription(userId, plan as PlanKey);
    sendSuccess(res, data, 'Subscription created');
  }

  async verify(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = req.body as {
      razorpayPaymentId?: string;
      razorpaySubscriptionId?: string;
      razorpaySignature?: string;
    };
    if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
      throw new BadRequestError('Missing verification fields');
    }
    const data = await membershipService.verifySubscription(userId, {
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
    });
    sendSuccess(res, data, 'Membership activated');
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const data = await membershipService.cancelSubscription(userId);
    sendSuccess(res, data, 'Membership will end at the period close');
  }
}

export default new MembershipController();
