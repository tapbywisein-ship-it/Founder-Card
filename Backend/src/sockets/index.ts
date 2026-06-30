import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '@config/env';
import redis from '@config/redis';
import { supabaseAdmin } from '@config/supabase';
import prisma from '@config/database';
import { REDIS_KEYS } from '@config/constants';
import logger from '@utils/logger';
import { notificationHandler } from './handlers/notification.handler';
import { connectionHandler } from './handlers/connection.handler';
import { chatHandler } from './handlers/chat.handler';
import { setSocketDependencies } from '@modules/notifications/notifications.service';

export let io: Server;

export const getSocketId = async (userId: string): Promise<string | null> => {
  return redis.get(`${REDIS_KEYS.SOCKET_USER}${userId}`);
};

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user?.email) {
        return next(new Error('Invalid authentication token'));
      }
      const user = await prisma.user.findFirst({
        where: { OR: [{ supabaseId: data.user.id }, { email: data.user.email }] },
        select: { id: true, email: true, role: true },
      });
      if (!user) return next(new Error('User not found'));
      socket.data.userId = user.id;
      socket.data.email = user.email;
      socket.data.role = user.role;

      next();
    } catch (error) {
      logger.warn('Socket authentication failed', { error });
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.info('Socket connected', { userId, socketId: socket.id });

    // Store userId -> socketId mapping in Redis
    await redis.setex(
      `${REDIS_KEYS.SOCKET_USER}${userId}`,
      24 * 60 * 60, // 24 hours
      socket.id
    );

    // Join user-specific room
    await socket.join(`user:${userId}`);

    // Emit connected event
    socket.emit('connected', {
      userId,
      socketId: socket.id,
      message: 'Connected to TapByWisein',
    });

    // Register handlers
    notificationHandler(socket, userId);
    connectionHandler(socket, userId);
    chatHandler(socket, userId);

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info('Socket disconnected', { userId, reason });
      await redis.del(`${REDIS_KEYS.SOCKET_USER}${userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', { userId, error });
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  // Set socket dependencies in notifications service
  const ioRef = {
    to: (room: string) => ({
      emit: (event: string, data: unknown) => {
        io.to(room).emit(event, data);
      },
    }),
  };

  setSocketDependencies(ioRef, getSocketId);

  logger.info('Socket.io server initialized');
  return io;
};

export default initSocketServer;
