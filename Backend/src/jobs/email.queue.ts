import prisma from '@config/database';
import logger from '@utils/logger';
import {
  sendEmail,
  sendEmailWithAttachments,
  welcomeEmail,
  connectionRequestEmail,
  founderCardApprovedEmail,
  eventReminderEmail,
  eventRegistrationConfirmationEmail,
  newRegistrationEmail,
  newMessageEmail,
  waitlistPromotedEmail,
  eventBlastEmail,
} from '@utils/email';

// Note: email/password verification and password-reset emails are NOT sent
// from here — Supabase Auth sends its own (signUp / resetPasswordForEmail on
// the frontend), so there is nothing to trigger on this side. If we ever move
// off Supabase's built-in auth emails, add the templates + cases back here.
export type EmailJobType =
  | 'welcome'
  | 'connectionRequest'
  | 'founderCardApproved'
  | 'eventReminder'
  | 'eventRegistrationConfirmation'
  | 'newRegistration'
  | 'newMessage'
  | 'waitlistPromoted'
  | 'eventBlast';

export interface EmailJobData {
  type: EmailJobType;
  to: string;
  name: string;
  requesterName?: string;
  requesterCompany?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventUrl?: string;
  // Free-form fields used by the newer template types.
  qrPngBase64?: string;
  senderName?: string;
  messagePreview?: string;
  conversationUrl?: string;
  subject?: string;
  bodyHtml?: string;
  ticketTierName?: string;
  ticketBenefits?: string[];
  attendeeName?: string;
  attendeesUrl?: string;
  /** Present only on 'eventBlast' jobs — lets the queue report real delivery
   *  outcomes back onto the persisted EventBlast row (see recordBlastOutcome). */
  blastId?: string;
}

/**
 * Single place every blast-send outcome (success or terminal failure) flows
 * through, regardless of whether Bull or the inline no-Redis path handled it.
 * Increments the real counter and flips status once every recipient resolves.
 */
async function recordBlastOutcome(blastId: string | undefined, success: boolean): Promise<void> {
  if (!blastId) return;
  try {
    const field = success ? 'sent' : 'failed';
    const updated = await prisma.eventBlast.update({
      where: { id: blastId },
      data: { [field]: { increment: 1 } },
    });
    if (updated.sent + updated.failed >= updated.total) {
      await prisma.eventBlast.update({
        where: { id: blastId },
        data: {
          status: updated.failed === 0 ? 'sent' : updated.sent === 0 ? 'failed' : 'partial',
          sentAt: new Date(),
        },
      });
    }
  } catch (err) {
    logger.error('Failed to record blast delivery outcome', { blastId, success, err });
  }
}

const REDIS_URL = process.env.BULL_REDIS_URL ?? process.env.REDIS_URL;
const hasRedis = !!REDIS_URL && REDIS_URL !== 'redis://localhost:6379';

// ─── No-op queue stub (used when Redis is not available) ──────────────────────
const noopQueue = {
  add: async (data: EmailJobData) => {
    // Process inline when no Redis queue is available. CRITICAL: attach a catch
    // here. Without it, a failed send (Resend 403, rate limit, bad address…)
    // becomes an unhandledRejection — the caller's `addEmailJob(...).catch()`
    // only guards the `add()` call, which resolves immediately, so the detached
    // job promise would reject with no handler and take the whole server down
    // via the global unhandledRejection → graceful-shutdown path. Emails are
    // best-effort; log and swallow so a bad email never crashes the API.
    processEmailJob(data)
      .then(() => recordBlastOutcome(data.blastId, true))
      .catch((err) => {
        logger.error('Inline email job failed', {
          type: data.type,
          to: data.to,
          error: err instanceof Error ? err.message : String(err),
        });
        void recordBlastOutcome(data.blastId, false);
      });
    return { id: 'inline', data } as unknown as import('bull').Job<EmailJobData>;
  },
  close: async () => {},
  on: () => noopQueue,
};

// ─── Real Bull queue (used when Redis is available) ───────────────────────────
let emailQueueInstance = noopQueue as unknown as import('bull').Queue<EmailJobData>;

if (hasRedis) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Bull = require('bull');
    const queue = new Bull('email', {
      redis: REDIS_URL,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    queue.process(async (job: import('bull').Job<EmailJobData>) => {
      await processEmailJob(job.data);
    });

    queue.on('failed', (job: import('bull').Job<EmailJobData>, err: Error) => {
      logger.error('Email job failed', {
        jobId: job.id,
        type: job.data.type,
        error: err.message,
        attemptsMade: job.attemptsMade,
      });
      // Bull emits 'failed' on every retry attempt, not just the final one —
      // only count it against the blast once retries are exhausted, or a job
      // that succeeds on attempt 2 would still show as a failure.
      const maxAttempts = job.opts?.attempts ?? 1;
      if (job.attemptsMade >= maxAttempts) {
        void recordBlastOutcome(job.data.blastId, false);
      }
    });

    // Redis-level errors (auth, TLS, connection drop) surface here, NOT via the
    // try/catch above — Bull connects lazily. Without this, a queue that can add
    // jobs but never process them (dead consumer) fails completely silently.
    queue.on('error', (err: Error) => {
      logger.error('Email queue Redis error — jobs may not be processed', { error: err.message });
    });
    queue.on('completed', (job: import('bull').Job<EmailJobData>) => {
      logger.info('Email job processed', { jobId: job.id, type: job.data.type });
      void recordBlastOutcome(job.data.blastId, true);
    });

    emailQueueInstance = queue;
    logger.info('Email queue initialized with Redis (Bull consumer active)');
  } catch (err) {
    logger.warn('Email queue: failed to init Bull, using inline processing', { error: err });
  }
} else {
  logger.info('Email queue: no Redis configured, emails will be sent inline');
}

export const emailQueue = emailQueueInstance;

// ─── Core email processing logic ──────────────────────────────────────────────
async function processEmailJob(data: EmailJobData): Promise<void> {
  let html = '';
  let subject = '';

  switch (data.type) {
    case 'welcome':
      html = welcomeEmail(data.name);
      subject = 'Welcome to TapByWisein!';
      break;
    case 'connectionRequest':
      html = connectionRequestEmail(
        data.name,
        data.requesterName ?? 'Someone',
        data.requesterCompany
      );
      subject = 'New Connection Request - TapByWisein';
      break;
    case 'founderCardApproved':
      html = founderCardApprovedEmail(data.name);
      subject = 'Your Founder Card is Approved! - TapByWisein';
      break;
    case 'eventReminder':
      if (!data.eventTitle || !data.eventDate || !data.eventLocation || !data.eventUrl) {
        throw new Error('Event details required');
      }
      html = eventReminderEmail(
        data.name,
        data.eventTitle,
        data.eventDate,
        data.eventLocation,
        data.eventUrl
      );
      subject = `Reminder: ${data.eventTitle} is tomorrow!`;
      break;
    case 'eventRegistrationConfirmation': {
      if (!data.eventTitle || !data.eventDate || !data.eventUrl) {
        throw new Error('Event details required');
      }
      html = eventRegistrationConfirmationEmail(
        data.name,
        data.eventTitle,
        data.eventDate,
        data.eventLocation ?? '',
        data.eventUrl,
        !!data.qrPngBase64,
        data.ticketTierName,
        data.ticketBenefits
      );
      subject = `You're in: ${data.eventTitle}`;
      if (data.qrPngBase64) {
        await sendEmailWithAttachments(data.to, subject, html, [
          {
            filename: 'ticket-qr.png',
            content: data.qrPngBase64,
            encoding: 'base64',
            cid: 'ticket-qr',
          },
        ]);
        logger.info('Email sent', { type: data.type, to: data.to });
        return;
      }
      break;
    }
    case 'newRegistration':
      if (!data.eventTitle || !data.attendeeName || !data.attendeesUrl) {
        throw new Error('Event, attendee and attendees-url details required');
      }
      html = newRegistrationEmail(
        data.name,
        data.attendeeName,
        data.eventTitle,
        data.attendeesUrl,
        data.ticketTierName
      );
      subject = `New registration: ${data.eventTitle}`;
      break;
    case 'newMessage':
      html = newMessageEmail(
        data.name,
        data.senderName ?? 'Someone',
        data.messagePreview ?? '',
        data.conversationUrl ?? ''
      );
      subject = `New message from ${data.senderName ?? 'TapByWisein'}`;
      break;
    case 'waitlistPromoted':
      if (!data.eventTitle || !data.eventUrl) throw new Error('Event details required');
      html = waitlistPromotedEmail(data.name, data.eventTitle, data.eventDate ?? '', data.eventUrl);
      subject = `You're off the waitlist for ${data.eventTitle}`;
      break;
    case 'eventBlast':
      if (!data.subject || !data.bodyHtml) throw new Error('Subject and body required');
      html = eventBlastEmail(data.name, data.bodyHtml);
      subject = data.subject;
      break;
    default:
      throw new Error(`Unknown email type: ${String(data.type)}`);
  }

  await sendEmail(data.to, subject, html);
  logger.info('Email sent', { type: data.type, to: data.to });
}

export const addEmailJob = async (
  type: EmailJobType,
  data: Omit<EmailJobData, 'type'>
): Promise<void> => {
  await emailQueue.add({ type, ...data } as EmailJobData);
};

export default emailQueue;
