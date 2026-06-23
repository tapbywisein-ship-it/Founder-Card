import cron from 'node-cron';
import prisma from '@config/database';
import redis from '@config/redis';
import { REDIS_KEYS, TOKEN_TTL } from '@config/constants';
import { env } from '@config/env';
import { sendEmail, eventReminderEmail, eventRecapEmail } from '@utils/email';
import notificationsService from '@modules/notifications/notifications.service';
import logger from '@utils/logger';

export const initScheduler = (): void => {
  // Clean expired tokens from Redis - every day at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Scheduler: Cleaning expired tokens...');
    try {
      // Redis TTL handles expiration automatically, but we clean DB refresh tokens
      const expiredTokens = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`Scheduler: Cleaned ${expiredTokens.count} expired DB refresh tokens`);
    } catch (error) {
      logger.error('Scheduler: Error cleaning expired tokens', { error });
    }
  });

  // Send event reminders - every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduler: Checking for event reminders...');
    try {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);

      const inTwentyFiveHours = new Date();
      inTwentyFiveHours.setHours(inTwentyFiveHours.getHours() + 25);

      const upcomingEvents = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          startDate: {
            gte: tomorrow,
            lte: inTwentyFiveHours,
          },
        },
        include: {
          registrations: {
            where: { status: { in: ['REGISTERED', 'WAITLISTED'] } },
            include: {
              user: {
                include: { profile: true },
              },
            },
          },
        },
      });

      for (const event of upcomingEvents) {
        for (const registration of event.registrations) {
          const user = registration.user;
          const name = user.profile
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.email;

          const location =
            event.locationType === 'VIRTUAL'
              ? event.meetingUrl ?? 'Online'
              : `${event.address ?? ''}, ${event.city ?? ''}, ${event.country ?? ''}`.trim();

          await sendEmail(
            user.email,
            `Reminder: ${event.title} is tomorrow!`,
            eventReminderEmail(
              name,
              event.title,
              event.startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              location,
              `${process.env.FRONTEND_URL}/events/${event.id}`
            )
          ).catch((err: Error) =>
            logger.error('Scheduler: Failed to send event reminder', { error: err.message })
          );
        }
      }

      if (upcomingEvents.length > 0) {
        logger.info(`Scheduler: Sent reminders for ${upcomingEvents.length} events`);
      }
    } catch (error) {
      logger.error('Scheduler: Error sending event reminders', { error });
    }
  });

  // Weekly leaderboard recalculation - every Sunday at 2am
  cron.schedule('0 2 * * 0', async () => {
    logger.info('Scheduler: Recalculating leaderboard rankings...');
    try {
      // Rankings are computed on-the-fly based on fkScore, so this job
      // can do cleanup / notifications for top movers
      const topUsers = await prisma.gamification.findMany({
        take: 10,
        orderBy: { fkScore: 'desc' },
        include: {
          user: {
            include: {
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      logger.info('Scheduler: Leaderboard top 10 recalculated', {
        count: topUsers.length,
      });
    } catch (error) {
      logger.error('Scheduler: Error recalculating leaderboard', { error });
    }
  });

  // Daily analytics snapshot - every day at 1am
  cron.schedule('0 1 * * *', async () => {
    logger.info('Scheduler: Generating daily analytics snapshot...');
    try {
      const [totalUsers, totalEvents, totalConnections, activeFounderCards] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.event.count({ where: { deletedAt: null } }),
        prisma.connection.count({ where: { status: 'ACCEPTED' } }),
        prisma.founderCard.count({ where: { status: 'ACTIVE' } }),
      ]);

      const snapshot = {
        date: new Date().toISOString().split('T')[0],
        totalUsers,
        totalEvents,
        totalConnections,
        activeFounderCards,
      };

      // Store in Redis as a daily snapshot
      await redis.setex(
        `analytics:daily:${snapshot.date}`,
        7 * 24 * 60 * 60, // 7 days TTL
        JSON.stringify(snapshot)
      );

      logger.info('Scheduler: Daily analytics snapshot saved', snapshot);
    } catch (error) {
      logger.error('Scheduler: Error generating analytics snapshot', { error });
    }
  });

  // Mark completed events - every hour
  cron.schedule('30 * * * *', async () => {
    try {
      const updated = await prisma.event.updateMany({
        where: {
          status: 'PUBLISHED',
          endDate: { lt: new Date() },
          deletedAt: null,
        },
        data: { status: 'COMPLETED' },
      });

      if (updated.count > 0) {
        logger.info(`Scheduler: Marked ${updated.count} events as completed`);
      }
    } catch (error) {
      logger.error('Scheduler: Error marking events as completed', { error });
    }
  });

  // Post-event recap — every hour, find events that ended 24h–7d ago without
  // a recap sent yet, then for each checked-in attendee email + notify the
  // people-you-met digest.
  cron.schedule('15 * * * *', async () => {
    try {
      const now = new Date();
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const horizon = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const events = await prisma.event.findMany({
        where: {
          deletedAt: null,
          recapSentAt: null,
          endDate: { lt: since, gt: horizon },
        },
        select: { id: true, title: true },
      });

      for (const event of events) {
        const checkedIn = await prisma.eventRegistration.findMany({
          where: { eventId: event.id, checkedIn: true, status: { not: 'CANCELLED' } },
          select: {
            userId: true,
            user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
          },
        });

        const connections = await prisma.connection.findMany({
          where: { eventId: event.id, status: 'ACCEPTED' },
          select: {
            requesterId: true,
            receiverId: true,
            requester: { select: { profile: { select: { firstName: true, lastName: true } } } },
            receiver: { select: { profile: { select: { firstName: true, lastName: true } } } },
          },
        });

        for (const reg of checkedIn) {
          const myConnections = connections.filter(
            (c) => c.requesterId === reg.userId || c.receiverId === reg.userId
          );
          if (myConnections.length === 0) continue;

          const others = myConnections.map((c) => {
            const otherProfile = c.requesterId === reg.userId ? c.receiver.profile : c.requester.profile;
            return otherProfile ? `${otherProfile.firstName} ${otherProfile.lastName}`.trim() : 'A founder';
          });
          const name = reg.user.profile
            ? `${reg.user.profile.firstName} ${reg.user.profile.lastName}`.trim()
            : reg.user.email;
          const recapUrl = `${env.FRONTEND_URL}/people-i-met`;

          sendEmail(
            reg.user.email,
            `You met ${myConnections.length} at ${event.title}`,
            eventRecapEmail(name, event.title, myConnections.length, others, recapUrl)
          ).catch(() => {});
          notificationsService
            .createNotification(
              reg.userId,
              'SYSTEM',
              `You met ${myConnections.length} at ${event.title}`,
              'Tap to revisit your network from this event.',
              { eventId: event.id }
            )
            .catch(() => {});
        }

        await prisma.event.update({
          where: { id: event.id },
          data: { recapSentAt: new Date() },
        });
      }

      if (events.length > 0) {
        logger.info(`Scheduler: sent recap for ${events.length} event(s)`);
      }
    } catch (error) {
      logger.error('Scheduler: Error sending event recaps', { error });
    }
  });

  // One-hour-before in-app reminder — every 15 minutes, find events starting in
  // ~60–75 min and push an in-app notification to confirmed attendees. De-duped
  // per event via a Redis key (2h TTL) so each event's guests are nudged once.
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      const in60 = new Date(now.getTime() + 60 * 60 * 1000);
      const in75 = new Date(now.getTime() + 75 * 60 * 1000);

      const events = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          startDate: { gte: in60, lte: in75 },
        },
        include: {
          registrations: { where: { status: 'REGISTERED' }, select: { userId: true } },
        },
      });

      for (const event of events) {
        const dedupeKey = `evt-1h-reminder:${event.id}`;
        const already = await redis.get(dedupeKey).catch(() => null);
        if (already) continue;
        await redis.setex(dedupeKey, 2 * 60 * 60, '1').catch(() => {});

        const userIds = event.registrations.map((r) => r.userId);
        if (userIds.length === 0) continue;
        await notificationsService
          .createBulkNotifications(
            userIds,
            'EVENT_REMINDER',
            `Starting soon: ${event.title}`,
            `"${event.title}" begins in about an hour.`,
            { eventId: event.id }
          )
          .catch(() => {});
      }

      if (events.length > 0) {
        logger.info(`Scheduler: 1-hour reminders pushed for ${events.length} event(s)`);
      }
    } catch (error) {
      logger.error('Scheduler: Error sending 1-hour reminders', { error });
    }
  });

  void TOKEN_TTL; // suppress unused warning
  logger.info('Scheduler: All cron jobs initialized');
};
