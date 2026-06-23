import { Request, Response } from 'express';
import paymentsService from './payments.service';
import { sendSuccess } from '@utils/response';
import { CreateOrderDto, VerifyPaymentDto } from './payments.validation';

export class PaymentsController {
  /** Lets the frontend know whether to show the paid-ticket flow at all. */
  async config(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { configured: paymentsService.isConfigured() }, 'Payment configuration');
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { eventId, ticketTierId } = req.body as CreateOrderDto;
    const result = await paymentsService.createOrder(userId, eventId, ticketTierId);
    sendSuccess(res, result, 'Payment order created');
  }

  async verify(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const dto = req.body as VerifyPaymentDto;
    const result = await paymentsService.verifyAndConfirm(userId, dto);
    sendSuccess(res, result, 'Payment verified — you are registered');
  }

  /** Printable HTML invoice for a paid registration. */
  async invoice(req: Request, res: Response): Promise<void> {
    const { registrationId } = req.params as Record<string, string>;
    const html = await paymentsService.getInvoiceHtml(registrationId, {
      userId: req.user!.userId,
      role: req.user!.role,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /** Razorpay server-to-server webhook (signature verified against raw body). */
  async webhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const raw =
      (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    if (!paymentsService.verifyWebhookSignature(raw, signature)) {
      res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      return;
    }
    await paymentsService.handleWebhookEvent(req.body as Record<string, unknown>);
    res.status(200).json({ success: true });
  }
}

export default new PaymentsController();
