import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { env } from '@config/env';

const isDev = env.NODE_ENV !== 'production';

/**
 * Default cap is intentionally generous because React Query polls a few
 * endpoints (unread counts, conversations, suggestions) and active users
 * easily exceed a low cap. Override via RATE_LIMIT_MAX env. In development
 * we skip rate limiting entirely so two browser windows on the same IP don't
 * trip each other.
 */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: false,
  skip: () => isDev,
  keyGenerator: (req) => {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  },
});

/**
 * Admin endpoints get a tighter bucket than the general one. Admin actions are
 * high-impact (ban user, suspend event); 60 req/min is more than enough for a
 * human at a console and limits damage from a hijacked admin token.
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Admin rate limit exceeded — slow down.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: false,
  skip: () => isDev,
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests for this action, please try again in 15 minutes.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  },
});

/**
 * Limiter for unauthenticated public writes (e.g. capturing a lead from a
 * public Founder Card). Kept moderate rather than strict because attendees at
 * an event often share one venue NAT/IP — too tight a cap would block genuine
 * visitors — while still stopping bulk spam of a card owner's inbox.
 */
export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many submissions from this network, please try again shortly.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: false,
  skip: () => isDev,
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown',
});

/**
 * Per-user limiter for the messages routes. Conversation IDs are UUIDs but
 * not secret; a per-user cap stops a logged-in attacker from brute-forcing
 * UUID space by hitting GET /messages/:id at rate-of-IP.
 */
export const messagesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Slow down — too many message requests.',
  },
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  skipSuccessfulRequests: false,
  skip: () => isDev,
  keyGenerator: (req) => {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    return userId ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';
  },
});
