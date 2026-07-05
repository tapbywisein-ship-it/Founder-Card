import { Router } from 'express';
import organizerController from './organizer.controller';
import { authenticate } from '@middlewares/authenticate';
import { authorize } from '@middlewares/authorize';
import { uploadCsvSingle } from '@middlewares/upload';

const router = Router();

// All routes require authentication and ORGANIZER role (ADMIN also allowed)
router.use(authenticate, authorize('ORGANIZER', 'ADMIN'));

router.get('/dashboard', organizerController.getDashboardStats.bind(organizerController));
router.get('/leads', organizerController.getLeads.bind(organizerController));
router.put('/leads/:id', organizerController.updateLeadStatus.bind(organizerController));
router.get('/leads/export', organizerController.exportLeads.bind(organizerController));
router.get('/attendees', organizerController.getAttendeeDirectory.bind(organizerController));
router.post('/attendees/blast', organizerController.sendAttendeeBlast.bind(organizerController));

// Razorpay Route payout account
router.get('/payouts/account', organizerController.getRouteAccount.bind(organizerController));
router.post('/payouts/onboard', organizerController.onboardRoute.bind(organizerController));
router.post(
  '/payouts/refresh-status',
  organizerController.refreshRouteStatus.bind(organizerController)
);
router.get(
  '/events/:id/analytics',
  organizerController.getEventAnalytics.bind(organizerController)
);
router.post('/events/:id/blast', organizerController.sendEventBlast.bind(organizerController));
router.post('/events/:id/checkin', organizerController.checkInAttendee.bind(organizerController));
router.get('/events/:id/guests', organizerController.getEventGuests.bind(organizerController));

// Phase 5 — co-organizers
router.get(
  '/events/:id/coorganizers',
  organizerController.listCoorganizers.bind(organizerController)
);
router.post(
  '/events/:id/coorganizers',
  organizerController.addCoorganizer.bind(organizerController)
);
router.delete(
  '/events/:id/coorganizers/:userId',
  organizerController.removeCoorganizer.bind(organizerController)
);

// Phase 5 — speakers + agenda
router.post('/events/:id/speakers', organizerController.createSpeaker.bind(organizerController));
router.delete(
  '/events/:id/speakers/:speakerId',
  organizerController.deleteSpeaker.bind(organizerController)
);
router.post('/events/:id/agenda', organizerController.createAgendaItem.bind(organizerController));
router.delete(
  '/events/:id/agenda/:itemId',
  organizerController.deleteAgendaItem.bind(organizerController)
);

// Phase 5 — custom registration questions
router.post(
  '/events/:id/questions',
  organizerController.createEventQuestion.bind(organizerController)
);
router.patch(
  '/events/:id/questions/:questionId',
  organizerController.updateEventQuestion.bind(organizerController)
);
router.delete(
  '/events/:id/questions/:questionId',
  organizerController.deleteEventQuestion.bind(organizerController)
);

// Phase 5 — pending-approval queue
router.get(
  '/events/:id/pending-approvals',
  organizerController.listPendingRegistrations.bind(organizerController)
);
router.post(
  '/events/:id/registrations/:regId/action',
  organizerController.actionPendingRegistration.bind(organizerController)
);

// Phase 3 — event-scoped role management
router.patch(
  '/events/:id/attendees/:userId/role',
  organizerController.setEventRole.bind(organizerController)
);

// Organizer-initiated refund (cancels + refunds the attendee's paid ticket)
router.post(
  '/events/:id/attendees/:userId/refund',
  organizerController.refundAttendee.bind(organizerController)
);

// Phase 3 — CSV attendee import (dryRun=1 returns preview, dryRun=0 commits)
router.post(
  '/events/:id/attendees/import',
  uploadCsvSingle('file'),
  organizerController.importAttendees.bind(organizerController)
);

// Phase 3 — networking analytics
router.get(
  '/events/:id/networking-analytics',
  organizerController.getNetworkingAnalytics.bind(organizerController)
);

// Curated intros — best attendee pairs to introduce
router.get(
  '/events/:id/matchmaking',
  organizerController.getMatchmaking.bind(organizerController)
);

// Duplicate event + export attendees CSV
router.post('/events/:id/duplicate', organizerController.duplicateEvent.bind(organizerController));
router.get(
  '/events/:id/attendees/export',
  organizerController.exportAttendeesCsv.bind(organizerController)
);

export default router;
