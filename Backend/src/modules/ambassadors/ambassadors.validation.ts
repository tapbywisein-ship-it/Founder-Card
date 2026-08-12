import { z } from 'zod';

export const AMBASSADOR_STATUSES = ['APPLIED', 'INTERVIEW', 'ACTIVE', 'REJECTED'] as const;

export const applyAmbassadorSchema = z.object({
  city: z.string().min(2, 'City is required').max(100),
  region: z.string().max(100).optional(),
  motivation: z.string().min(20, 'Tell us a bit more — at least 20 characters').max(2000),
});

export const updateAmbassadorStatusSchema = z.object({
  status: z.enum(AMBASSADOR_STATUSES),
  reviewNote: z.string().max(2000).optional(),
});

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, 'Required').max(120),
  phone: z.string().min(6, 'Required').max(20),
  addressLine1: z.string().min(1, 'Required').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1, 'Required').max(100),
  state: z.string().min(1, 'Required').max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

export const dispatchRewardSchema = z.object({
  trackingId: z.string().min(1).max(100),
  trackingProvider: z.string().min(1).max(60),
});

export type ApplyAmbassadorDto = z.infer<typeof applyAmbassadorSchema>;
export type UpdateAmbassadorStatusDto = z.infer<typeof updateAmbassadorStatusSchema>;
export type SubmitShippingAddressDto = z.infer<typeof shippingAddressSchema>;
export type DispatchRewardDto = z.infer<typeof dispatchRewardSchema>;
