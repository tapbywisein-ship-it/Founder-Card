import { z } from 'zod';

export const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  ticketTierId: z.string().min(1),
  couponCode: z.string().trim().min(1).max(40).optional(),
  referralCode: z.string().trim().min(1).max(40).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type VerifyPaymentDto = z.infer<typeof verifyPaymentSchema>;
