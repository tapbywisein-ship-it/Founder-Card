import { z } from 'zod';

export const REPORT_TARGET_TYPES = ['USER', 'EVENT', 'CONNECTION', 'COMMENT'] as const;
export const REPORT_CATEGORIES = [
  'SPAM',
  'HARASSMENT',
  'IMPERSONATION',
  'INAPPROPRIATE',
  'OTHER',
] as const;
export const REPORT_STATUSES = ['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'] as const;
export const ADMIN_ACTIONS = [
  'DISMISS',
  'ACTION_USER_BAN',
  'ACTION_USER_WARN',
  'ACTION_EVENT_REMOVE',
  'MARK_REVIEWING',
] as const;

export const fileReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().min(1, 'Target id is required'),
  category: z.enum(REPORT_CATEGORIES),
  reason: z.string().min(8, 'Reason must be at least 8 characters').max(2000),
});

export const actionReportSchema = z.object({
  action: z.enum(ADMIN_ACTIONS),
  resolution: z.string().max(2000).optional(),
});

export type FileReportDto = z.infer<typeof fileReportSchema>;
export type ActionReportDto = z.infer<typeof actionReportSchema>;
