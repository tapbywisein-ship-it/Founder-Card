import prisma from '@config/database';
import { env } from '@config/env';
import { sendEmail } from '@utils/email';
import logger from '@utils/logger';

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
    const html = `
      <h2>New demo request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
    `;
    await sendEmail(env.SMTP_FROM, `Demo request from ${name}`, html).catch((e: Error) =>
      logger.error('Failed to send demo request', { error: e.message })
    );
    return { ok: true };
  }
}

export default new PublicService();
