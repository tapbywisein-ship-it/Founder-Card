import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().min(1, 'Address is required').max(255),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  country: z.string().min(1, 'Country is required').max(100),
  pincode: z.string().min(3, 'Pincode is required').max(20),
  virtual: z.boolean().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
});

export const createEventSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200).trim(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(10000).trim(),
    startDate: z.coerce.date().refine((d) => d > new Date(), 'Start date must be in the future'),
    endDate: z.coerce.date(),
    location: locationSchema.optional(),
    capacity: z.coerce.number().int().min(1).max(100000).default(100),
    // Restrict event creation to in-person only.
    // This prevents new events from being created/updated with VIRTUAL/HYBRID types.
    type: z.enum(['IN_PERSON']).default('IN_PERSON'),
    tags: z.array(z.string().max(50).trim()).max(10).optional().default([]),
    ticketPrice: z.coerce.number().min(0).optional(),
    coverImage: z.string().optional(),
    category: z.string().min(1, 'Category is required').max(100),
    theme: z.string().max(50).optional().default('default'),
    slug: z
      .string()
      .max(200)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens')
      .optional(),
    requiresApproval: z.boolean().optional().default(false),
    waitlistEnabled: z.boolean().optional().default(true),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional().default('PUBLIC'),
    timezone: z.string().max(100).optional().default('UTC'),
    communityId: z.string().uuid().optional(),
    ticketTypes: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().max(100),
          price: z.coerce.number().min(0),
          count: z.coerce.number().int().min(0),
          benefits: z.array(z.string().max(200)).max(20),
          color: z.string().max(50).optional(),
          isEnabled: z.boolean().optional().default(true),
        })
      )
      .max(10)
      .optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const updateEventSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(10).max(10000).trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  location: locationSchema.optional(),
  capacity: z.coerce.number().int().min(1).max(100000).optional(),
  // Restrict event updates to in-person only.
  type: z.enum(['IN_PERSON']).optional(),
  tags: z.array(z.string().max(50).trim()).max(10).optional(),
  ticketPrice: z.coerce.number().min(0).optional(),
  coverImage: z.string().optional(),
  category: z.string().max(100).optional(),
  theme: z.string().max(50).optional(),
  requiresApproval: z.boolean().optional(),
  waitlistEnabled: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  timezone: z.string().max(100).optional(),
  communityId: z.string().uuid().nullable().optional(),
  ticketTypes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(100),
        price: z.coerce.number().min(0),
        count: z.coerce.number().int().min(0),
        benefits: z.array(z.string().max(200)).max(20),
        color: z.string().max(50).optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .max(10)
    .optional(),
});

export const searchEventsSchema = z.object({
  q: z.string().max(200).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  // Restrict search filter to in-person only.
  type: z.enum(['IN_PERSON']).optional(),
  category: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  tags: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  // Discover free/paid toggle. Filters on the single ticketPrice field.
  price: z.enum(['free', 'paid']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  orderBy: z.enum(['startDate', 'createdAt', 'title']).optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
  // Phase 5 — "Find at events" button on a connection's card.
  // When set, only return events where both withUser AND the authenticated
  // viewer have a non-cancelled registration. viewerId is filled by the
  // controller from req.user, never accepted from the client.
  withUser: z.string().uuid().optional(),
  viewerId: z.string().uuid().optional(),
});

// Luma-style guest RSVP — unauthenticated user registers with name + email.
// Backend silently finds-or-creates the user (one email = one account), then
// registers them for the event. No password ever required.
export const rsvpGuestSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  name: z.string().min(1, 'Name is required').max(100).trim(),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;
export type UpdateEventDto = z.infer<typeof updateEventSchema>;
export type SearchEventsDto = z.infer<typeof searchEventsSchema>;
export type RsvpGuestDto = z.infer<typeof rsvpGuestSchema>;
