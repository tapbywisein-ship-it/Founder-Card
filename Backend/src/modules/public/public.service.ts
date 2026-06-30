import prisma from '@config/database';
import logger from '@utils/logger';
import { sendEmail } from '@utils/email';
import { env } from '@config/env';

const ADMIN_EMAIL = env.EMAIL_FROM.replace(/^.*<(.+)>$/, '$1');

export class PublicService {
  /** Lightweight public counters for landing-page social proof. */
  async getStats() {
    const [founders, connections, events] = await Promise.all([
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.connection.count({ where: { status: 'ACCEPTED' } }),
      prisma.event.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    ]);
    return { founders, connections, events };
  }

  /** Capture an organizer "Request a demo" lead — emails the platform inbox. */
  async demoRequest(input: { name: string; email: string; company?: string; message?: string }) {
    const { name, email, company, message } = input;

    logger.info('Demo request received', { name, email, company });

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#0A0E2E;margin-bottom:16px">New Demo Request</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;font-weight:600;color:#374151;width:120px">Name</td><td style="padding:8px 0;color:#111827">${name}</td></tr>
          <tr><td style="padding:8px 0;font-weight:600;color:#374151">Email</td><td style="padding:8px 0;color:#111827"><a href="mailto:${email}" style="color:#3B6FF0">${email}</a></td></tr>
          ${company ? `<tr><td style="padding:8px 0;font-weight:600;color:#374151">Company</td><td style="padding:8px 0;color:#111827">${company}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;font-weight:600;color:#374151;vertical-align:top">Message</td><td style="padding:8px 0;color:#111827;white-space:pre-wrap">${message}</td></tr>` : ''}
        </table>
      </div>
    `;

    await sendEmail(
      ADMIN_EMAIL,
      `Demo request from ${name}${company ? ` (${company})` : ''}`,
      html
    );

    return { ok: true };
  }
}

export default new PublicService();
