import { Resend } from 'resend';
import { env } from '@config/env';
import logger from './logger';

const resend = new Resend(env.RESEND_API_KEY);

const FROM = `TapByWisein <${env.EMAIL_FROM}>`;

/**
 * Escape HTML special chars so user-controlled values can't inject markup
 * into email templates rendered by mail clients.
 */
export const escapeHtml = (s: string | null | undefined): string => {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
};

/**
 * Convert untrusted plain text (e.g. the organizer blast composer, a plain
 * <textarea>) into safe email HTML: escape everything, then turn newlines
 * into <br>. This is the only sanctioned way user-typed text may enter an
 * email body — never interpolate it as raw HTML.
 */
export const plainTextToEmailHtml = (text: string): string =>
  `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;

const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TapByWisein</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #eef1f6; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    .body h2 { color: #0A0E2E; font-size: 22px; margin: 0 0 16px; font-weight: 700; letter-spacing: -0.3px; }
    .body p { color: #4a4a6a; line-height: 1.7; margin: 0 0 16px; font-size: 15px; }
    .body ul { color: #4a4a6a; line-height: 1.8; margin: 0 0 16px; padding-left: 20px; font-size: 15px; }
    .button { display: inline-block; background: #3B6FF0; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 9999px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .code-box { background: #f6f8fc; border: 1px solid #e3e9f5; border-radius: 12px; padding: 20px 22px; margin: 20px 0; }
    .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0A0E2E; font-family: 'SF Mono', Menlo, monospace; }
    .divider { height: 1px; background: #eef1f6; margin: 24px 0; line-height: 1px; }
    .warning { background: #EAF1FF; border-left: 4px solid #3B6FF0; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #1a3a8f; margin: 16px 0; }
    @media (max-width: 620px) { .card { width: 100% !important; } .pad { padding: 28px 24px !important; } }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef1f6;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#eef1f6;">TapByWisein — where founders connect.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header: solid brand color renders reliably where gradients get stripped. -->
        <tr><td align="center" bgcolor="#0A0E2E" style="background:#0A0E2E;padding:30px 40px;">
          <img src="${env.FRONTEND_URL}/logo-dark.png" alt="TapByWisein" height="28" style="height:28px;width:auto;display:inline-block;border:0;" />
          <div style="color:#93a4c9;font-size:13px;margin-top:8px;">Where founders connect</div>
        </td></tr>
        <tr><td class="body pad" style="padding:36px 40px;">${content}</td></tr>
        <tr><td align="center" bgcolor="#f6f8fc" style="background:#f6f8fc;padding:26px 40px;border-top:1px solid #eef1f6;">
          <div style="color:#8a93a6;font-size:12px;line-height:1.6;">&copy; ${new Date().getFullYear()} TapByWisein · Made for founders, by founders.</div>
          <div style="color:#8a93a6;font-size:12px;line-height:1.6;margin-top:4px;">Questions? <a href="mailto:support@tapbywisein.com" style="color:#3B6FF0;text-decoration:none;">support@tapbywisein.com</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Email templates ──────────────────────────────────────────────────────────

export const welcomeEmail = (name: string): string =>
  baseTemplate(`
    <h2>Welcome to TapByWisein, ${escapeHtml(name)}!</h2>
    <p>You've just joined a network of founders, innovators, and visionaries. We're thrilled to have you.</p>
    <ul>
      <li>Connect with other founders at events</li>
      <li>Apply for your <strong>Founder Card</strong></li>
      <li>Track your <strong>FK Score</strong> and earn badges</li>
      <li>Discover and register for exclusive events</li>
    </ul>
    <a href="${env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
  `);

export const eventRsvpConfirmationEmail = (
  name: string,
  eventTitle: string,
  eventUrl: string
): string =>
  baseTemplate(`
    <h2>You're going to ${escapeHtml(eventTitle)}!</h2>
    <p>Hi ${escapeHtml(name)}, your RSVP is confirmed. We'll email a reminder closer to the event.</p>
    <a href="${eventUrl}" class="button">View event</a>
  `);

export const eventRecapEmail = (
  name: string,
  eventTitle: string,
  connectionsCount: number,
  peopleNames: string[],
  recapUrl: string
): string =>
  baseTemplate(`
    <h2>Your ${escapeHtml(eventTitle)} recap</h2>
    <p>Hi ${escapeHtml(name)}, you connected with <strong>${connectionsCount} ${connectionsCount === 1 ? 'person' : 'people'}</strong> at the event.</p>
    ${
      peopleNames.length > 0
        ? `<p>${peopleNames.slice(0, 5).map(escapeHtml).join(', ')}${peopleNames.length > 5 ? ` and ${peopleNames.length - 5} more` : ''}.</p>`
        : ''
    }
    <a href="${recapUrl}" class="button">See everyone you met</a>
  `);

export const inviteClaimEmail = (name: string, claimUrl: string, eventTitle: string): string =>
  baseTemplate(`
    <h2>You're invited to ${escapeHtml(eventTitle)}</h2>
    <p>Hi ${escapeHtml(name) || 'there'}, an organizer added you to <strong>${escapeHtml(eventTitle)}</strong> on TapByWisein.</p>
    <p>Tap the button below to set your password and view your ticket.</p>
    <a href="${claimUrl}" class="button">Claim your account</a>
    <div class="warning">This invite link expires in <strong>14 days</strong>.</div>
  `);

export const connectionRequestEmail = (
  recipientName: string,
  requesterName: string,
  requesterCompany?: string
): string =>
  baseTemplate(`
    <h2>New Connection Request</h2>
    <p>Hi ${escapeHtml(recipientName)},</p>
    <p><strong>${escapeHtml(requesterName)}</strong>${requesterCompany ? ` from ${escapeHtml(requesterCompany)}` : ''} wants to connect with you on TapByWisein.</p>
    <a href="${env.FRONTEND_URL}/connections" class="button">View Request</a>
  `);

export const founderCardApprovedEmail = (name: string): string =>
  baseTemplate(`
    <h2>Your Founder Card is Active!</h2>
    <p>Congratulations ${escapeHtml(name)}! Your Founder Card application has been <strong>approved</strong>.</p>
    <ul>
      <li>Your unique <strong>Founder Card QR code</strong> for networking</li>
      <li><strong>100 FK Score points</strong> added to your profile</li>
      <li>Exclusive founder-tier events and features</li>
    </ul>
    <a href="${env.FRONTEND_URL}/connect" class="button">View Your Founder Card</a>
  `);

export const eventReminderEmail = (
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  eventUrl: string
): string =>
  baseTemplate(`
    <h2>Event Reminder: ${escapeHtml(eventTitle)}</h2>
    <p>Hi ${escapeHtml(name)}, you have an upcoming event tomorrow!</p>
    <div class="code-box" style="text-align:left; padding: 20px;">
      <p style="margin:0 0 8px;"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
      <p style="margin:0 0 8px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
      <p style="margin:0;"><strong>Location:</strong> ${escapeHtml(eventLocation)}</p>
    </div>
    <a href="${eventUrl}" class="button">View Event Details</a>
  `);

export const eventRegistrationConfirmationEmail = (
  name: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  eventUrl: string,
  hasQr: boolean = false,
  ticketTierName?: string | null,
  ticketBenefits?: string[]
): string =>
  baseTemplate(`
    <h2>You're in: ${escapeHtml(eventTitle)}</h2>
    <p>Hi ${escapeHtml(name)}, your registration is confirmed.</p>
    <div class="code-box" style="text-align:left; padding: 20px;">
      <p style="margin:0 0 8px;"><strong>Event:</strong> ${escapeHtml(eventTitle)}</p>
      <p style="margin:0 0 8px;"><strong>Date:</strong> ${escapeHtml(eventDate)}</p>
      ${eventLocation ? `<p style="margin:0${ticketTierName ? ' 0 8px' : ''};"><strong>Location:</strong> ${escapeHtml(eventLocation)}</p>` : ''}
      ${ticketTierName ? `<p style="margin:0;"><strong>Ticket:</strong> ${escapeHtml(ticketTierName)}</p>` : ''}
      ${
        ticketBenefits && ticketBenefits.length > 0
          ? `<ul style="margin:8px 0 0;padding-left:20px;">${ticketBenefits.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
          : ''
      }
    </div>
    ${
      hasQr
        ? `<p>Bring this QR code with you to check in:</p>
      <p style="text-align:center;"><img src="cid:ticket-qr" alt="Ticket QR" style="width:200px;height:200px;" /></p>`
        : ''
    }
    <a href="${eventUrl}" class="button">View Event Details</a>
  `);

/** Organizer-facing: fires whenever someone confirms a registration for their event. */
export const newRegistrationEmail = (
  organizerName: string,
  attendeeName: string,
  eventTitle: string,
  attendeesUrl: string,
  ticketTierName?: string | null
): string =>
  baseTemplate(`
    <h2>New registration: ${escapeHtml(eventTitle)}</h2>
    <p>Hi ${escapeHtml(organizerName)}, <strong>${escapeHtml(attendeeName)}</strong> just registered for <strong>${escapeHtml(eventTitle)}</strong>${ticketTierName ? ` (${escapeHtml(ticketTierName)})` : ''}.</p>
    <a href="${attendeesUrl}" class="button">View Attendees</a>
  `);

export const newMessageEmail = (
  name: string,
  senderName: string,
  preview: string,
  conversationUrl: string
): string =>
  baseTemplate(`
    <h2>New message from ${escapeHtml(senderName)}</h2>
    <p>Hi ${escapeHtml(name)}, you have a new message on TapByWisein:</p>
    <div class="code-box" style="text-align:left; padding: 16px;">
      <p style="margin:0;">${escapeHtml(preview)}</p>
    </div>
    <a href="${conversationUrl}" class="button">Reply</a>
  `);

export const waitlistPromotedEmail = (
  name: string,
  eventTitle: string,
  eventDate: string,
  eventUrl: string
): string =>
  baseTemplate(`
    <h2>You're off the waitlist!</h2>
    <p>Great news, ${escapeHtml(name)} — a spot just opened for <strong>${escapeHtml(eventTitle)}</strong>${eventDate ? ` on ${escapeHtml(eventDate)}` : ''} and you're now confirmed.</p>
    <a href="${eventUrl}" class="button">View Event</a>
    <p style="font-size:12px;color:#888;">Can't make it? Cancel from the event page so the next person gets your seat.</p>
  `);

export const eventBlastEmail = (name: string, bodyHtml: string): string =>
  baseTemplate(`<p>Hi ${escapeHtml(name)},</p>${bodyHtml}`);

export const refundConfirmationEmail = (
  name: string,
  eventTitle: string,
  amountLabel: string
): string =>
  baseTemplate(`
    <h2>Your refund is on its way</h2>
    <p>Hi ${escapeHtml(name)}, we've processed a refund of <strong>${escapeHtml(amountLabel)}</strong> for <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="font-size:13px;color:#555;">Refunds typically settle within 5–7 business days depending on your bank.</p>
  `);

export const cardDispatchedEmail = (
  name: string,
  trackingId: string,
  trackingProvider: string,
  trackingUrl?: string
): string =>
  baseTemplate(`
    <h2>Your Tap Card is on its way! ⚡</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Great news — your TapByWisein NFC Founder Card has been dispatched and is heading your way.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9f9f9;border-radius:8px;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#555;border-bottom:1px solid #eee;width:40%;">Courier</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #eee;">${escapeHtml(trackingProvider)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#555;">Tracking ID</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#1a1a1a;font-family:monospace;">${escapeHtml(trackingId)}</td>
      </tr>
    </table>
    ${trackingUrl ? `<p style="text-align:center;margin:24px 0;"><a href="${escapeHtml(trackingUrl)}" style="background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Track your shipment</a></p>` : ''}
    <p style="font-size:13px;color:#555;">Your card will arrive within <strong>5–7 working days</strong>. Once you receive it, tap it against any phone to instantly share your founder profile — no app needed.</p>
    <p style="font-size:13px;color:#555;">You can also check your order status anytime on your <a href="https://tapbywisein.com/apply-card" style="color:#6366f1;">Tap Card page</a>.</p>
  `);

// ─── Send helpers ─────────────────────────────────────────────────────────────

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (env.NODE_ENV === 'test') {
    logger.debug('Email skipped in test env', { to, subject });
    return;
  }

  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(error.message);
    logger.info('Email sent', { to, subject, id: data?.id });
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error });
    throw error;
  }
};

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  encoding: 'base64';
  cid?: string; // for inline images
}

export const sendEmailWithAttachments = async (
  to: string,
  subject: string,
  html: string,
  attachments: EmailAttachment[]
): Promise<void> => {
  if (env.NODE_ENV === 'test') {
    logger.debug('Email skipped in test env', { to, subject });
    return;
  }

  try {
    const resendAttachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, 'base64'),
      // Forward the content-id so `<img src="cid:...">` inline images resolve
      // (Resend maps contentId → content_id). Without this the QR shows broken.
      ...(a.cid ? { contentId: a.cid } : {}),
    }));

    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      attachments: resendAttachments,
    });
    if (error) throw new Error(error.message);
    logger.info('Email with attachments sent', { to, subject, id: data?.id });
  } catch (error) {
    logger.error('Failed to send email with attachments', { to, subject, error });
    throw error;
  }
};

export default {
  sendEmail,
  sendEmailWithAttachments,
  welcomeEmail,
  eventRsvpConfirmationEmail,
  eventRecapEmail,
  inviteClaimEmail,
  connectionRequestEmail,
  founderCardApprovedEmail,
  eventReminderEmail,
  eventRegistrationConfirmationEmail,
  newRegistrationEmail,
  newMessageEmail,
  waitlistPromotedEmail,
  eventBlastEmail,
  refundConfirmationEmail,
};
