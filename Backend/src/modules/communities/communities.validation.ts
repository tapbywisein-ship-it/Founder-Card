import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80).trim(),
  description: z.string().max(1000).trim().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  category: z.string().max(50).trim().optional(),
  isPublic: z.boolean().optional(),
});

export const updateCommunitySchema = createCommunitySchema.partial();

export type CreateCommunityDto = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityDto = z.infer<typeof updateCommunitySchema>;
