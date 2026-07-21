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

export type ApplyAmbassadorDto = z.infer<typeof applyAmbassadorSchema>;
export type UpdateAmbassadorStatusDto = z.infer<typeof updateAmbassadorStatusSchema>;
