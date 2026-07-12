# TapByWisein — Full Codebase Audit

**Date:** 2026-07-12 · **Scope:** entire repo (Backend 18,488 LOC · Frontend 33,560 LOC · 48 Prisma models · 115 indexes)
**Method:** import-graph analysis (script, not grep-guessing), route/mount tracing, schema review, dependency cross-reference, security sweep. Every "unused" claim below was verified against dynamic imports, side-effect imports, extension-suffixed imports, and named-router mounts — the false positives those produce are called out explicitly.

Companion doc: [SCALE-READINESS.md](SCALE-READINESS.md) (infra runbook for the P0/P1 scale fixes; PRs #39/#40 already open).

---

## PART 1 — Dead Code & Code Waste

### 1a. Verified-unused application code (safe to delete)

| # | File | LOC | Confidence | Why it's dead | Risk of removal |
|---|------|-----|-----------|---------------|-----------------|
| 1 | `Frontend/src/components/EventCard.tsx` | 222 | High | Zero importers; pages render their own event cards inline | None — build catches any miss |
| 2 | `Frontend/src/components/CategoryGrid.tsx` | 63 | High | Zero importers | None |
| 3 | `Frontend/src/components/ProfileCompletionMeter.tsx` | 61 | High | Zero importers (a different completion UI lives in Profile page) | None |
| 4 | `Frontend/src/lib/useAuthGate.tsx` | 55 | High | Zero importers; superseded by `SignInModal` + `ProtectedRoute` | None |
| 5 | `Frontend/src/components/NavLink.tsx` | 29 | High | Zero importers (the string "NavLink" elsewhere is react-router's export) | None |
| 6 | `Frontend/src/components/PageTransition.tsx` | 21 | High | Zero importers | None |
| 7 | `Frontend/src/pages/Index.tsx` | 15 | High | Scaffold leftover; not in App.tsx routes | None |
| 8 | `Frontend/src/lib/calendarLinks.ts` | 12 | High | Zero importers; `lib/calendar.ts` is the live one | None |
| 9 | `Backend/src/utils/jwt.ts` | 36 | High | Zero importers — auth moved to Supabase JWT verification in `middlewares/authenticate` | None |

**Subtotal: ~514 LOC, delete in one PR.**

### 1b. Unused shadcn/ui primitives (bulk, decide once)

37 of the stock shadcn components under `Frontend/src/components/ui/` have **zero importers** (~2,990 LOC): `sidebar` (638), `chart` (304), `carousel` (225), `menubar` (208), `context-menu` (179), `command` (133), `form` (130), `navigation-menu` (121), `breadcrumb` (91), `drawer` (88), `pagination` (82), `table` (73), plus 25 smaller ones.

- **Confidence:** High (import-graph verified).
- **Suggested fix:** delete them; shadcn's whole model is "copy back in when needed" (`npx shadcn add <name>`).
- **Risk:** None at runtime (tree-shaking already excludes them from the bundle) — the win is repo hygiene, grep signal, and typecheck time, not bytes shipped.
- Deleting `ui/form.tsx` also frees `react-hook-form` + the two deps below.

### 1c. Unused dependencies

| Package | Where | Evidence | Fix |
|---|---|---|---|
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | Backend | Media module uses Supabase Storage; zero imports | `npm rm` — heaviest install-size win |
| `nodemailer` | Backend | All mail via Resend (`utils/email.ts:1`) | `npm rm` |
| `reflect-metadata` | Backend | Zero imports (decorator-era leftover) | `npm rm` |
| `zod` + `@hookform/resolvers` | Frontend | Only referenced by the unused `ui/form.tsx` | `npm rm` after 1b |

### 1d. Unused env vars & schema

- `env.ts`: **`API_PREFIX`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`** declared, never read (queue uses `REDIS_URL`/`BULL_REDIS_URL` directly). Delete from schema + `.env.example`.
- Prisma model **`PasswordResetToken`**: zero queries anywhere — password reset is Supabase-side. Drop the model (and table) in the next migration.

### 1e. Verified NOT dead (false positives a naive scan would flag)

- `pages/NotFound.tsx` — imported **with extension** (`./pages/NotFound.tsx`) in App.tsx.
- `modules/og/*` — mounted via **named exports** (`ogImageRouter`/`ogHtmlRouter`, app.ts:177-179).
- `express-async-errors` — **side-effect import** (app.ts:1); it's what makes async route errors reach the error middleware. Do not remove.
- `DATABASE_URL` "unread" — read by Prisma from `process.env`, not via `env.`; keep.
- Test files (`*.test.*`, `test/setup.ts`) — vitest/jest entry points.

### 1f. Duplication & over-engineering

- **Landing design tokens** (`NAVY`, `ACCENT`, `GOLD`…) redeclared in 5+ components (LandingPage, FeatureBento, TapCardSection, ParticleWordmark, ExitIntentPopup). Deliberate pattern, but it's now past the threshold — one `lib/landingTheme.ts` would end the copy-paste.
- **Two calendar helpers** (`lib/calendar.ts` live, `lib/calendarLinks.ts` dead) — resolved by 1a.
- No factory/interface astronautics found; module structure is consistently thin controllers → fat services. Over-engineering is **not** this codebase's problem.

**Estimated removable: ~3,500 LOC + 5 dependencies + 4 env vars + 1 table.**

---

## PART 2 — System Design Review

### Capacity ladder (honest read)

| Users | Verdict | What breaks first |
|---|---|---|
| 100 | ✅ Works today | Nothing |
| 1,000 | ✅ Works today | Blast endpoint on a big event (request timeout) — fixed in PR #40 |
| 10,000 | ⚠️ Needs PR #40 merged + Redis provisioned + region move | Cross-region DB latency (0.7s/round-trip) makes p95 miserable; in-memory rate limiter + no socket adapter block adding a 2nd instance |
| 100,000 | ❌ Re-work needed | ILIKE search seq-scans; 9 in-process cron jobs duplicate on multi-instance; single Postgres write node; notifications/score_history table growth |
| 1M | ❌ Different architecture | Queue-first writes, read replicas, search service, partitioning (messages, notifications, page_views), multi-region |

### Frontend
- **Structure:** pages/components/hooks/services/lib — conventional, navigable. ✅
- **State:** Zustand (session) + React Query (server state, 5-min staleTime, no window-focus refetch) — correct split, no Redux bloat. ✅
- **Routing/splitting:** every page lazy except entry points; verified real chunks. ✅ (geo dataset fixed in PR #39.)
- **Weak spots:** zero component tests except one; `AppLayout.tsx` at 525 lines is doing nav + notifications + search + theme and will keep growing.

### Backend
- **Boundaries:** 21 modules, consistent `routes → controller → service` with zod validation at the edge. Genuinely good. ✅
- **Auth:** Supabase JWT verified in middleware; roles on the user row; `authorize()` per route; admin router blanket-gated (`authenticate, authorize('ADMIN'), adminLimiter` — admin.routes.ts:19). ✅
- **AuthZ model caveat:** "organizer" is **self-serve instant upgrade** — it is a UX tier, not a trust tier. All real protection comes from ownership checks (`organizerId === user.id`), which are consistently present in services. Correct, but document it — future features must never treat `ORGANIZER` as vetted.
- **Error handling:** `express-async-errors` + central error middleware + typed error classes. ✅
- **Jobs:** 9 cron jobs in `jobs/scheduler.ts` run **inside the web process, no distributed lock** → on 2+ instances every reminder/recap email sends N times. Must move to a worker or take a Postgres advisory lock before scale-out.

### Database
- 48 models, 115 indexes; hot tables (Connection, EventRegistration, Message, Notification) all have the right composite/single indexes — spot-verified. ✅
- FKs present with guarded idempotent migrations.
- **Growth risks:** `EventPageView` (per-view row), `ScoreHistory`, `Notification` — all append-only, none archived. Fine to 10k users; needs retention policy by 100k.
- **Schema-management risk:** `db push` + hand-run SQL in Supabase console (8 manual migrations) = no migration history, no rollback. The single biggest operational risk as team/traffic grows.

---

## PART 3 — Scalability (per feature)

| Feature | Current capacity | Breaking point | Why | Fix |
|---|---|---|---|---|
| Email blast | ~50 recipients | ~100+ recipients | Sequential `await sendEmail` in-request (organizer.service.ts:507) | **PR #40** — queued, 202-immediately |
| Matchmaking | ~200 attendees | ~500+ attendees | O(n²) pair scoring in event loop (organizer.service.ts:1159) | Cap candidates / precompute nightly |
| Search | ~20k users | ~100k rows | 6-field OR `contains` = unindexable ILIKE seq scan (search.routes.ts:24-44) | Postgres `tsvector` + GIN index |
| Messaging realtime | 1 instance | 2nd instance | No socket.io Redis adapter | **PR #40** |
| Rate limiting | 1 instance | 2nd instance / every deploy | In-memory store | **PR #40** |
| Cron emails | 1 instance | 2nd instance | No job locking → duplicate sends | Advisory lock or dedicated worker |
| Any DB endpoint | — | p95 degrades under modest concurrency | Render(US) ↔ Supabase(Tokyo) ≈ 0.7s/round-trip | **Region move — highest single lever** |
| File uploads | ✅ 5MB, images-only, sharp re-encode | CPU at high concurrency | sharp in web process | Fine for 10k; offload later |

**Single points of failure:** one Render instance (web + crons + sockets + inline email in one process), one Postgres (no replica), Resend (no fallback), Razorpay webhook endpoint (verified sig ✅ but no dead-letter/replay).

---

## PART 4 — Security Review

| # | Severity | Finding | Attack scenario | Fix |
|---|---|---|---|---|
| S1 | **Medium** | `Frontend/.env` is **committed to git** with live Supabase URL + publishable key | The `sb_publishable_` anon key is public **by design** (it ships in the JS bundle regardless), so this is not a leak of a secret — but the pattern normalizes committing `.env`, and the next person may add a real secret to it | `git rm --cached Frontend/.env`, add to `.gitignore`, commit `.env.example`. Audit git history for past real secrets once |
| S2 | **Medium** | Blast `body` is organizer-supplied **raw HTML** injected into recipient emails (`eventBlastEmail(name, bodyHtml)`) | Self-serve organizer upgrade + HTML email = anyone can send styled phishing to their own event's registrants under your domain's sending reputation | Sanitize with an allowlist (bold/links/paragraphs) server-side; you already have the sanitizer pattern in escapeHtml |
| S3 | **Low-Med** | No CSRF tokens — acceptable **only because** auth is `Authorization: Bearer`, not cookies | If anyone ever adds cookie-based sessions, every state-changing endpoint becomes CSRF-able silently | Add a comment in `authenticate.ts` documenting the invariant |
| S4 | **Low** | `express.json({ limit: '10mb' })` — generous for a JSON API | 10MB JSON bodies amplify memory pressure under abuse | Drop to 1MB; uploads already go through multer (5MB, image-only) |
| S5 | **Low** | Public slug suffixes use `Math.random` (events.service.ts:113) | None — slugs are public identifiers, not tokens. Real tokens (check-in, claim) use `crypto.randomBytes` ✅ | Optional: switch for consistency |
| S6 | **Info** | Prisma-only data access, no `$queryRaw` anywhere → SQLi surface ≈ 0 ✅ | — | — |
| S7 | **Info** | XSS: React escaping everywhere; the only `dangerouslySetInnerHTML` is in the *unused* `ui/chart.tsx` (deleted by Part 1b) ✅ | — | — |
| S8 | **Info** | Webhook signature verified against raw body ✅; admin router blanket-gated ✅; uploads size+MIME-limited and re-encoded via sharp ✅; helmet+CORS allowlist+trust-proxy ✅ | — | — |

No hardcoded secrets found in source. No missing-auth endpoints found in the modules traced (public endpoints are deliberately public and the risky one — lead capture — is rate-limited).

---

## PART 5 — Performance

**Frontend**
- ✅ Fixed in PR #39: 8.6MB CreateEvent chunk → 31KB.
- Remaining: no `React.memo` discipline in long lists (Connections, Discover) — fine at current data sizes; revisit with virtualization (you have no windowing) when lists exceed ~200 items.
- Landing page ships a full-bleed autoplay video — biggest remaining page-weight item; consider `preload="metadata"` + poster.

**Backend**
- The dominant cost is **geography, not code** (0.7s/DB round-trip). The `Promise.all` batching discipline (PR #30) is the right mitigation and is applied on the hot dashboards.
- No caching layer at all: `/public/stats`, event lists, leaderboard are identical-for-everyone reads recomputed per request. A 60-second in-memory (or Redis) cache on those three erases most read load.
- Blast/matchmaking: covered in Part 3.

**Database**
- Indexes: hot paths covered (verified Connection/EventRegistration/Message/Notification). Search is the one unindexable pattern (Part 3).
- ~83 of 112 `findMany` calls have no `take` — most are bounded by ownership scoping in practice, but guest lists and rosters for a 5k-person event will serialize megabytes. Add `take` + pagination to roster-shaped endpoints as they grow.

**Infrastructure cost**
- Current: Render Starter + Supabase + Vercel ≈ small fixed cost. The audit finds no waste to cut — the spend problem is the opposite: you're one instance from needing Redis (~$10/mo) and a region-matched Render service. Cost of fixing everything above ≈ +$10–25/mo. Cheap insurance.

---

## PART 6 — Architecture Quality Score

| Category | Score | One-line justification |
|---|---|---|
| Code Quality | **7.5/10** | Consistent idiom, typed edges, honest comments; dead shadcn bulk and thin tests hold it back |
| Architecture | **7/10** | Clean modular monolith — right choice for this stage; crons/sockets/queue coupled to web process caps it |
| Scalability | **5/10 today → 7/10** with PR #40 + Redis + region move | All blockers known and fixes staged |
| Security | **7/10** | Strong fundamentals (webhook sig, upload hygiene, no raw SQL, blanket admin gate); committed .env + unsanitized blast HTML are the deductions |
| Performance | **6/10** | One structural handicap (cross-region), zero caching; code-level perf is fine post-#39 |
| Maintainability | **7.5/10** | Predictable module pattern, good comments; `db push` migrations and 525-line AppLayout deduct |
| Developer Experience | **6.5/10** | CI (typecheck+build) exists; no test gate, no lint gate in CI, manual SQL migrations |
| Production Readiness | **6/10** | Shipped and working, but single-instance assumptions (rate limit, sockets, crons) are latent incidents |

---

## PART 7 — Recommended Improvements

### Quick wins (1–2 days)
1. Merge **PR #39** (bundle) + **PR #40** (blast queue, Redis rate-limit store, socket adapter, readiness probe) and provision Redis.
2. Dead-code deletion PR: Part 1a files + 1b shadcn bulk + 1c deps + 1d env vars (~3,500 LOC).
3. `git rm --cached Frontend/.env` + gitignore (S1).
4. Sanitize blast HTML (S2) — one allowlist function.
5. 60s cache on `/public/stats`, events list first page, leaderboard.

### Medium (1–2 weeks)
6. **Move Render to Supabase's region** — halves every endpoint's latency; biggest user-visible win available.
7. Advisory-lock the 9 cron jobs (`pg_advisory_lock`) so scale-out can't double-send.
8. Adopt `prisma migrate deploy` in CI; convert the 8 manual migrations into a baseline.
9. Postgres full-text search (tsvector + GIN) replacing 6-field ILIKE.
10. CI: add test + lint jobs; backfill tests for payments verify/webhook and registration state machine (the two money paths).

### Major (1–3 months)
11. Split a **worker process** (same repo, second Render service): Bull consumers + crons move out of the web process.
12. Retention/archival for `EventPageView`, `ScoreHistory`, `Notification`.
13. Read-path caching strategy (Redis) for public cards + event pages (they're the NFC-tap hot path — every physical tap hits them).

### Future (100k+)
14. Postgres read replica for feed/leaderboard/analytics; partition messages + notifications by month; CDN-cache OG images and public cards at the edge; consider search extraction only when tsvector actually strains (~1M+ rows), not before.

### Architecture — current vs. target

```
CURRENT (one process does everything)          TARGET (10k–100k)
┌─────────── Render: 1 instance ─────────┐    ┌── Render web ×N ─┐   ┌─ Render worker ─┐
│ Express API                            │    │ Express API      │   │ Bull consumers  │
│ + socket.io (in-proc)                  │    │ socket.io        │   │ 9 cron jobs     │
│ + 9 cron jobs (in-proc)                │    │ (Redis adapter)  │   │ (advisory lock) │
│ + inline email fallback                │    └────────┬─────────┘   └────────┬────────┘
│ + in-memory rate limits                │             │      ┌──────────┐   │
└──────────────┬──────────────────────── ┘             ├──────┤  Redis   ├───┤
               │  0.7s/round-trip (cross-region!)      │      │ rl/queue │   │
        ┌──────┴──────┐                          ┌─────┴────┐ │ /socket  │   │
        │  Supabase   │                          │ Supabase │ └──────────┘   │
        │  PG (Tokyo) │                          │ PG (SAME │◄───────────────┘
        └─────────────┘                          │  region) │
                                                 └──────────┘
```

---

## PART 8 — Executive Summary

**Top dead-code removals (by LOC):** ui/sidebar 638 · ui/chart 304 · ui/carousel 225 · EventCard 222 · ui/menubar 208 · ui/context-menu 179 · ui/command 133 · ui/form 130 · ui/navigation-menu 121 · ui/breadcrumb 91 · ui/drawer 88 · ui/pagination 82 · ui/table 73 · CategoryGrid 63 · ProfileCompletionMeter 61 · ui/calendar 55 · useAuthGate 55 · ui/tabs 54 · ui/accordion 53 · jwt.ts 36 — plus 5 deps, 4 env vars, 1 DB table. **≈3,500 LOC.**

**Top architecture issues:** web process = API+sockets+crons+email (1) · cron duplication on scale-out (2) · `db push` no-history migrations (3) · in-memory rate limiting (4) · no socket adapter (5) · no caching tier (6) · organizer-is-not-a-trust-tier undocumented (7) · AppLayout monolith (8) · no retention policy on append-only tables (9) · single region mismatch (10).

**Top scalability risks:** cross-region latency · blast-in-request (PR #40) · ILIKE search · O(n²) matchmaking · cron double-fire · unbounded rosters · zero cache · single PG node.

**Top security items:** committed `Frontend/.env` (hygiene) · unsanitized blast HTML (phishing vector) · 10MB JSON limit · CSRF-invariant undocumented. Fundamentals (SQLi, XSS, webhooks, uploads, RBAC on admin) are **solid**.

**Estimated impact:** ~3,500 LOC removed · region move + caching ≈ **50–80% p95 latency reduction** on read endpoints · +$10–25/mo infra to unlock horizontal scaling · the two open PRs (#39, #40) already close 4 of the top 10 risks.

**Priority order:** merge #39+#40 → Redis → dead-code PR + .env fix + blast sanitizer → region move → cron locks + migrate-deploy → tsvector search → worker split.
