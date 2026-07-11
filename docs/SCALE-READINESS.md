# Scale-Readiness — Findings & Actions

Audit of the codebase for ~10,000 users. Each finding from the review, what was
done, and what still needs a human with infra/console access.

## Fixed in code

| # | Finding | Fix | Where |
|---|---|---|---|
| 1 | Email blasts sent sequentially in the HTTP request → timeout on large lists | Enqueue one job per recipient (non-blocking); worker delivers with retry | `organizer.service.ts` `sendEventBlast` / `sendAttendeeBlast` |
| 3 | Rate limiter used per-process in-memory store (resets on deploy, multiplies across instances) | Redis-backed shared store when Redis is configured; falls back to memory | `middlewares/rateLimiter.ts`, `config/redis.ts` |
| 4 | CreateEvent JS chunk was 8.6 MB (bundled 7.7 MB city dataset) | Dynamic `import()` splits geo data into its own on-demand chunk (→ 31 KB) | `lib/geo.ts`, `pages/organizer/CreateEvent.tsx` (PR #39) |
| 5 | Socket.IO had no adapter → real-time breaks across >1 instance | Redis adapter attached when Redis is configured | `sockets/index.ts` |
| 6 | `connection_limit` not set → Prisma can exhaust the pgbouncer pool | Documented recommended pooling params on `DATABASE_URL` | `.env.example` (must be applied in the Render env var) |
| 9 | `/health` didn't check the DB → LB could route to a broken instance | Added `/health/ready` that pings Prisma and returns 503 when the DB is down | `app.ts` |

## Verified already-OK (no change needed)

| # | Finding | Reality |
|---|---|---|
| 7 | Matchmaking O(n²) | Already capped at `take: 150` (~11k cheap iterations, <10 ms). Bounded. |
| 10 | Pagination gaps | Every hot, high-cardinality client list paginates via `parsePaginationQuery` with a hard `MAX_LIMIT=100` (discovery, guests, roster, notifications, messages, leaderboard, connections, community feed/comments). Internal full-scans (blast recipients, announcement members) are intentional and separately capped. |

## Needs a human — infra / process

### #2 — Provision Redis in production (unblocks #1, #3, #5)
The code paths above all **gracefully fall back** without Redis, but their real
benefit only lands once Redis exists. Today the app degrades to: emails sent
inline, per-process rate limiting, single-instance-only real-time.

1. Provision a Redis instance (Render Key Value, Upstash, etc.).
2. Set both env vars on the backend service to the connection URL:
   - `REDIS_URL` — used by the socket adapter and rate-limit store.
   - `BULL_REDIS_URL` — used by the email/blast queue.
   (Anything other than `redis://localhost:6379` activates the real client.)
3. Redeploy. Confirm the logs show:
   - `Redis [main]: connected`
   - `Rate limiting: using shared Redis store`
   - `Socket.IO: Redis adapter attached (multi-instance broadcast enabled)`
   - `Email queue initialized with Redis`

### #6 (apply) — Set the pooling params on the live DATABASE_URL
`.env.example` now documents them, but the value that matters is the **Render
env var**. Append to the runtime `DATABASE_URL` (the pgbouncer :6543 one):
`&connection_limit=5&pool_timeout=10`. Size `connection_limit` as
`pgbouncer pool ÷ instance count`.

### #8 — Move off `db push` + hand-run SQL to migrations in CI
Schema is currently applied with `prisma db push` plus manual SQL files in
`Backend/prisma/manual-migrations/` run by hand in the Supabase console. This
leaves no migration history and risks drift as the team/traffic grows.

Path forward (do once, low-traffic window):
1. `prisma migrate diff` the live DB against `schema.prisma` to generate a
   baseline migration; commit it under `prisma/migrations/`.
2. Fold the applied manual-migrations into that baseline (they're already live).
3. Switch deploys to run `prisma migrate deploy` (uses `DIRECT_URL`).
4. Stop using `db push` outside local dev.

### Latency (not a discrete finding, but the dominant one)
Backend region ≠ Supabase region (US ↔ Tokyo) → ~0.7 s per DB round-trip. This
amplifies everything. Moving the backend to Supabase's region is the single
highest-leverage change once the above land.
