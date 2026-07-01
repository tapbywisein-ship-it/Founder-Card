import { Router } from 'express';
import eventsController from './events.controller';
import { authenticate } from '@middlewares/authenticate';
import { optionalAuthenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { validate } from '@middlewares/validate';
import {
  createEventSchema,
  updateEventSchema,
  searchEventsSchema,
  rsvpGuestSchema,
} from './events.validation';

const router = Router();

// Public / optional auth
router.get(
  '/',
  optionalAuthenticate,
  validate(searchEventsSchema, 'query'),
  eventsController.listEvents.bind(eventsController)
);
router.get('/my', authenticate, eventsController.getMyEvents.bind(eventsController));
router.get('/saved', authenticate, eventsController.listSaved.bind(eventsController));
router.get(
  '/organizer',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.getOrganizerEvents.bind(eventsController)
);
router.get('/:id', optionalAuthenticate, eventsController.getEvent.bind(eventsController));

// Organizer routes
router.post(
  '/',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  validate(createEventSchema),
  eventsController.createEvent.bind(eventsController)
);
router.put(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  validate(updateEventSchema),
  eventsController.updateEvent.bind(eventsController)
);
router.delete(
  '/:id',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.deleteEvent.bind(eventsController)
);
router.post(
  '/:id/publish',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.publishEvent.bind(eventsController)
);
router.post(
  '/:id/cancel',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.cancelEvent.bind(eventsController)
);
router.get(
  '/:id/attendees',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.getEventAttendees.bind(eventsController)
);

// Public custom-registration questions
router.get('/:id/questions', eventsController.listQuestions.bind(eventsController));

// Public speakers + agenda
router.get('/:id/speakers', eventsController.listSpeakers.bind(eventsController));
router.get('/:id/agenda', eventsController.listAgenda.bind(eventsController));

// Attendee routes
router.post(
  '/:id/register',
  authenticate,
  eventsController.registerForEvent.bind(eventsController)
);
router.delete(
  '/:id/register',
  authenticate,
  eventsController.cancelRegistration.bind(eventsController)
);

// Attendee-facing event roster + suggestions — visible to registered attendees.
// Service-level checks decide who can see what; no role gate required here.
router.get(
  '/:id/attendees-public',
  authenticate,
  eventsController.listAttendeesForAttendee.bind(eventsController)
);
router.get(
  '/:id/suggestions',
  authenticate,
  eventsController.getEventSuggestions.bind(eventsController)
);

// Save / unsave bookmark
router.post('/:id/save', authenticate, eventsController.toggleSave.bind(eventsController));
router.delete('/:id/save', authenticate, eventsController.toggleSave.bind(eventsController));

// Self check-in — attendee scans the event's check-in poster QR
router.get(
  '/:id/checkin-token',
  authenticate,
  eventsController.getCheckInToken.bind(eventsController)
);
router.post('/checkin/:token', authenticate, eventsController.selfCheckIn.bind(eventsController));

// Guest RSVP — unauthenticated users RSVP with email + name. Backend
// silently finds-or-creates the user (one email = one account). Confirmation
// email doubles as proof of inbox ownership.
router.post(
  '/:id/rsvp-guest',
  validate(rsvpGuestSchema),
  eventsController.rsvpGuest.bind(eventsController)
);

// Coupon validation — any authenticated user (attendees apply at checkout)
router.get(
  '/:id/coupons/:code/validate',
  authenticate,
  eventsController.validateCoupon.bind(eventsController)
);

// Public — track a page view (anonymous or authed). Idempotent per session.
router.post(
  '/:id/view',
  optionalAuthenticate,
  eventsController.trackPageView.bind(eventsController)
);

// Organizer — list visitors who viewed the event page.
router.get(
  '/:id/visitors',
  authenticate,
  authorize('ORGANIZER', 'ADMIN'),
  eventsController.listVisitors.bind(eventsController)
);

export default router;
