# FounderKey — Backend

Express + Prisma + PostgreSQL backend for **FounderKey**, the event-networking platform built around the **Founder Card**. Serves the [`../Frontend`](../Frontend) SPA over `/api/v1` and a handful of crawler-facing endpoints (`/og`, `/sitemap.xml`).

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 |
| Language | TypeScript 5 (strict) |
| HTTP | Express 4 |
| ORM | Prisma 5 on PostgreSQL (Supabase pooler in production) |
| Auth | JWT (access + refresh) for password auth, Supabase server SDK for Google OAuth verification |
| Cache / sessions | Redis (with an in-memory fallback for local dev) |
| Email | Nodemailer over Gmail SMTP — templated for verify / reset / RSVP / refund / connection / blast |
| Payments | Razorpay REST (orders + webhooks); the SDK is optional |
| Realtime | socket.io for notifications and live event channels |
| File upload | `multer` for CSV invites and avatar uploads |
| Validation | zod (one schema per route via the `validate()` middleware) |
| Logging | pino through `@utils/logger` |
| Rate limit | `express-rate-limit` (auth, admin, per-user, strict) |

## Getting started

Requires Node.js ≥ 20 and a reachable Postgres database.

```sh
# from D:/Founder-Key/Backend
npm install
cp .env.example .env       # fill in DATABASE_URL, JWT secrets, SMTP, Supabase, …
npx prisma generate
# This project has no migration history; apply schema via:
npx prisma db push          # or `prisma db execute --file <sql>` for additive migrations
npm run dev                 # ts-node-dev on http://localhost:3000
```

### Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | yes | Postgres connection strings (pooled + direct for migrations) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | yes | ≥32-char secrets, rotated per env |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | no | Defaults `15m` / `7d` |
| `BCRYPT_ROUNDS` | no | Defaults `12` |
| `FRONTEND_URL` | yes | Used in emails and CORS allowlist |
| `ALLOWED_ORIGINS` | yes | Comma-separated CORS origins |
| `REDIS_URL` | no | Falls back to in-memory store if absent or `localhost:6379` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | yes (OAuth) | For Google sign-in verification |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes (email) | Transactional email via Resend; `EMAIL_FROM` must be a Resend-verified sender |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | no | Payments are gracefully disabled when unset |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | no | Global limiter tunables |
| `LOG_LEVEL`, `LOG_DIR` | no | Defaults `info`, `logs` |

## npm scripts

```sh
npm run dev          # ts-node-dev with @config/database etc. resolved via tsconfig paths
npm run build        # tsc → dist/
npm start            # node dist/server.js
npm test             # vitest / jest (per config)
npx prisma studio    # open the Prisma DB explorer
```

## Project layout

```
src/
├─ modules/
│  ├─ auth/              register, login, refresh, OAuth, verify-email, password reset, claim-token
│  ├─ users/             /me, profile, payout account, blocks
│  ├─ events/            CRUD, capacity, slug resolution, check-in tokens, suggestions, recap
│  ├─ registrations/     RSVP, approval, cancellation, check-in
│  ├─ payments/          Razorpay orders, verify, webhook, refunds, invoices
│  ├─ payouts/           Revenue ledger + manual settlement
│  ├─ connections/       request / accept / reject / remove / block / QR-scan handshake
│  ├─ messages/          DMs (conversation + message + mark-as-read + per-user limiter)
│  ├─ notifications/     in-app + email + socket.io fan-out (bulk dedupes)
│  ├─ gamification/      FK Score, levels, badges, score history
│  ├─ founderCards/      apply, approve/reject, auto-issue, QR vCard
│  ├─ leads/             organizer lead inbox + CSV export
│  ├─ blasts/            organizer email blasts
│  ├─ organizer/         dashboard, attendee directory, CSV import, analytics
│  ├─ admin/             users (role/status/ban/delete with last-admin guard), events,
│  │                     analytics, audit log, permissions, settings, founder-card review
│  ├─ public/            unauth stats + demo-request
│  └─ seo/               sitemap.xml + Open Graph crawler endpoints
├─ middlewares/          authenticate, authorize, validate, rateLimiter, errorHandler, notFoundHandler
├─ config/               env (zod-validated), database (Prisma), redis (with memory fallback), supabase, constants
├─ utils/                crypto, jwt, errors, pagination, response, logger, email (templated)
├─ app.ts                Express app — body parsers, CORS, router mounts, error middleware
└─ server.ts             HTTP listener + socket.io + graceful shutdown
prisma/
├─ schema.prisma         Single source of truth for all models
└─ migrations/           Manually applied SQL (no `prisma migrate` history)
scripts/
└─ verify-all.mjs        End-to-end live verifier — hits the deployed API and asserts each fixed flow
```

## Key flows

### The Founder Card

`POST /founder-cards/apply` from the attendee app creates a card application. The admin reviews it; on approval the service mints a 6-char member id (e.g. `FK-A1B2C`), generates a QR with the public slug, awards 100 FK Score points, flips the user's `tier` to `FOUNDER` (atomic `updateMany(tier!='FOUNDER')` so the score is never double-awarded), and writes a `FOUNDER_CARD_ISSUED` audit row. Re-issuances write `FOUNDER_CARD_REISSUED` without re-awarding score.

### QR / NFC handshake

Two users meeting at an event: the scanner POSTs the scanned slug to `POST /connections/qr-scan`. The service creates a `Connection` (PENDING), pings the receiver via socket.io + email, and — if both users are registered for the same event — records a `EventTap` row used by the post-event "people I met" page.

### Tickets + payments

The frontend opens a Razorpay checkout; the order amount is derived **server-side** from the event's tier price. The webhook handler atomically transitions `Payment(status=CREATED → PAID)` via `updateMany`, so a duplicate webhook (or webhook arriving alongside the manual verify) can't double-finalize. Refunds are best-effort against the Razorpay refund endpoint.

### Auth

- Email + password with bcrypt; access token (15m JWT) + refresh token (7d, stored in Redis or memory fallback).
- Google OAuth via Supabase: client gets a Supabase access token, we verify it server-side and mint our own tokens. Hijack guard: a Google sign-in for an email that already has a password account is **rejected**, not silently linked.
- Forgot/reset password uses DB-backed `PasswordResetToken` rows (SHA-256 hashed); resetting invalidates all refresh tokens.
- CSV-invited users land on `/claim/:token`. Tokens are SHA-256 hashed in `ClaimToken`.
- Last-admin guard: role-change, status-change, ban, and delete all reject when they would leave zero active admins. Admins also can't ban or delete themselves.

## API conventions

All responses follow:

```json
{ "success": true,  "message": "...", "data": ... }
{ "success": false, "message": "...", "data": null }
```

Validation errors (zod) return 400 (or 422) with the field path. Auth failures return 401 (`UnauthorizedError`) or 403 (`ForbiddenError`). Not-found returns 404. Rate-limit returns 429.

OpenAPI annotations live as JSDoc above each route — wire up `swagger-ui-express` against them if you need browseable docs.

## Build + deploy

`npm run build` compiles to `dist/`. In production the backend is bundled with the frontend into one Docker image (see the root [`Dockerfile`](../Dockerfile) and `deploy/`), with `supervisord` running nginx + node together. Deploy target: Azure App Service for Linux, single-container.

## License

Internal project. All rights reserved.
