import { z } from 'zod';

export const sendConnectionSchema = z.object({
  receiverId: z.string().uuid('Invalid receiver ID'),
});

export const respondConnectionSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT'], {
    errorMap: () => ({ message: 'Action must be ACCEPT or REJECT' }),
  }),
});

export const scanQRSchema = z
  .object({
    qrData: z.string().min(1).optional(),
    slug: z.string().min(1).max(64).optional(),
    targetUserId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    method: z.enum(['QR', 'NFC', 'MANUAL']).optional(),
  })
  .refine(
    (v) => Boolean(v.qrData || v.slug || v.targetUserId),
    'Provide qrData, slug, or targetUserId'
  );

export type SendConnectionDto = z.infer<typeof sendConnectionSchema>;
export type RespondConnectionDto = z.infer<typeof respondConnectionSchema>;
export type ScanQRDto = z.infer<typeof scanQRSchema>;
