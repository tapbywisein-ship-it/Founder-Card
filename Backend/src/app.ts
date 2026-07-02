import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { env } from '@config/env';
import { getSwaggerSpec } from '@config/swagger';
import { requestLogger } from '@middlewares/requestLogger';
import { generalLimiter } from '@middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { sessionCookie } from '@middlewares/sessionCookie';

// Route imports
import authRoutes from '@modules/auth/auth.routes';
import usersRoutes from '@modules/users/users.routes';
import eventsRoutes from '@modules/events/events.routes';
import connectionsRoutes from '@modules/connections/connections.routes';
import founderCardsRoutes from '@modules/founder-cards/founder-cards.routes';
import gamificationRoutes from '@modules/gamification/gamification.routes';
import notificationsRoutes from '@modules/notifications/notifications.routes';
import organizerRoutes from '@modules/organizer/organizer.routes';
import adminRoutes from '@modules/admin/admin.routes';
import mediaRoutes from '@modules/media/media.routes';
import reportsRoutes from '@modules/reports/reports.routes';
import messagesRoutes from '@modules/messages/messages.routes';
import paymentsRoutes from '@modules/payments/payments.routes';
import payoutsRoutes from '@modules/payouts/payouts.routes';
import membershipRoutes from '@modules/membership/membership.routes';
import seoRoutes from '@modules/seo/seo.routes';
import publicRoutes from '@modules/public/public.routes';
import searchRoutes from '@modules/search/search.routes';
import { ogImageRouter, ogHtmlRouter } from '@modules/og/og.routes';

const app = express();

// Behind Render's (and any) reverse proxy, trust the first proxy hop so
// req.ip resolves the real client IP from X-Forwarded-For. Without this,
// express-rate-limit keys every request on the proxy IP — one shared bucket
// for all users, and trivially bypassable per-IP limits.
app.set('trust proxy', 1);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In development allow all origins so any local port works
    if (env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Handle OPTIONS preflight for all routes first
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── Body Parsing ────────────────────────────────────────────────────────────
// Capture the raw request body so the Razorpay webhook can verify its HMAC
// signature against the exact bytes Razorpay signed.
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sessionCookie);

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── Static Files ────────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Swagger API Docs ────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, (_req: Request, res: Response, next: NextFunction) => {
  swaggerUi.setup(getSwaggerSpec(), {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TapByWisein API',
    swaggerOptions: { persistAuthorization: true },
  })(_req, res, next);
});

app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.json(getSwaggerSpec());
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const API_BASE = `/api/${env.API_VERSION}`;

app.use(`${API_BASE}/auth`, authRoutes);
app.use(`${API_BASE}/users`, usersRoutes);
app.use(`${API_BASE}/events`, eventsRoutes);
app.use(`${API_BASE}/connections`, connectionsRoutes);
app.use(`${API_BASE}/founder-cards`, founderCardsRoutes);
app.use(`${API_BASE}/gamification`, gamificationRoutes);
app.use(`${API_BASE}/notifications`, notificationsRoutes);
app.use(`${API_BASE}/organizer`, organizerRoutes);
app.use(`${API_BASE}/admin`, adminRoutes);
app.use(`${API_BASE}/media`, mediaRoutes);
app.use(`${API_BASE}/reports`, reportsRoutes);
app.use(`${API_BASE}/messages`, messagesRoutes);
app.use(`${API_BASE}/payments`, paymentsRoutes);
app.use(`${API_BASE}/payouts`, payoutsRoutes);
app.use(`${API_BASE}/membership`, membershipRoutes);
app.use(`${API_BASE}/seo`, seoRoutes);
app.use(`${API_BASE}/public`, publicRoutes);
app.use(`${API_BASE}/search`, searchRoutes);
app.use(`${API_BASE}/og`, ogImageRouter);
// Crawler-facing HTML endpoints sit at the root so unfurlers see clean URLs.
app.use('/og', ogHtmlRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
