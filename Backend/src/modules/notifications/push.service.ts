import webpush from 'web-push';
import prisma from '@config/database';
import { env } from '@config/env';
import logger from '@utils/logger';

/**
 * Web Push (VAPID) fan-out. Optional: when VAPID keys are unset the whole
 * module no-ops so in-app + socket notifications keep working unchanged.
 */

const isConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (isConfigured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  logger.info('Push: web-push configured with VAPID keys');
} else {
  logger.info('Push: VAPID keys not set — browser push disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export class PushService {
  isConfigured(): boolean {
    return isConfigured;
  }

  getPublicKey(): string {
    return env.VAPID_PUBLIC_KEY;
  }

  /** Upsert a browser subscription for a user (keyed by unique endpoint). */
  async saveSubscription(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string
  ) {
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return null;
    }
    return prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    });
  }

  /** Remove a subscription (unsubscribe / logout). */
  async removeSubscription(endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  /**
   * Fan a payload out to every browser a user has subscribed. Best-effort:
   * dead subscriptions (404/410 Gone) are pruned; other errors are logged and
   * swallowed so a push failure never breaks the calling flow.
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!isConfigured) return;

    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            logger.warn('Push: send failed', { userId, endpoint: s.endpoint.slice(0, 40), statusCode });
          }
        }
      })
    );
  }

  /** Fan out to many users (bulk notifications). */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!isConfigured || userIds.length === 0) return;
    await Promise.all(Array.from(new Set(userIds)).map((id) => this.sendToUser(id, payload)));
  }
}

export default new PushService();
