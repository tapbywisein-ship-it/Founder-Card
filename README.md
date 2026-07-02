# TapByWisein

**TapByWisein** is an event-networking platform built around the **Tap Card** — an NFC + QR business card that founders, organizers, and attendees use to connect at startup events. Scan a card, send a connection request, message in-app, and walk away with a real CRM of every person you met.

This repo holds the two halves of the platform:

```
Founder-Card/
├── Frontend/         React/Vite SPA (attendee, organizer, admin, public) — deployed on Vercel
└── Backend/          Express/Prisma API + socket.io + email + payments — deployed on Render (Docker)
```

Frontend and Backend each have their own README with stack details, env vars, and project layout:

- [`Frontend/README.md`](Frontend/README.md)
- [`Backend/README.md`](Backend/README.md)

## What the platform does

| Surface | Who | What they do |
|---|---|---|
| Attendee | Anyone who signs in | Discover events, RSVP / buy tickets, scan cards to connect, message, track their FK Score and badges |
| Organizer | Anyone who signs in | Create + manage events, ticket tiers, CSV-invite guests, check-in, email blasts, leads, payouts |
| Admin | Platform staff | Users (role / status / ban / delete with last-admin guard), events, Tap Card review, audit log, analytics, settings |
| Public | Anyone | Landing, shareable event pages (`/e/:slug`), shareable Tap Cards (`/c/:slug`), pricing, legal |

### The Tap Card

Every onboarded user gets a **Tap Card** — a unique member id (`TW-XXXXX`), a QR code, a vCard download, and a public profile at `/c/:slug`. Scanning another card at an event sends a connection request, attributes a "people I met here" entry, and awards both sides FK Score points. The digital card is free and auto-issued; an optional physical NFC card can be purchased.

## Architecture at a glance

```
  Browser
     │
     ├─▶ Vercel  ──────────────▶  Frontend (Vite SPA, static)
     │
     └─▶ Render  ──────────────▶  Backend (Express / Node :3000)
                                       │ Prisma
                                       ▼
                        Supabase Postgres  ·  Supabase Auth (Google OAuth)
                        Resend (email)     ·  Razorpay (payments, REST)
```

- **Frontend** deploys to **Vercel** from `main` (build dir: `Frontend/`).
- **Backend** deploys to **Render** as a Docker web service built from [`Backend/Dockerfile`](Backend/Dockerfile). All runtime secrets are set as environment variables in the Render dashboard — never committed to the repo.
- Redis is optional; the backend falls back to an in-memory store when `REDIS_URL` is unset.

## Quick start (local dev)

Run the Frontend and Backend as two separate dev processes.

```sh
# 1) Backend on :3000
cd Backend
npm install
cp .env.example .env            # fill in DATABASE_URL, Supabase keys, RESEND_API_KEY, ...
npx prisma generate
npx prisma db push              # this project has no migration history
npm run dev

# 2) Frontend on :8080
cd ../Frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:3000/api/v1, Supabase keys
npm run dev
```

Open <http://localhost:8080>.

## Deploy

- **Frontend (Vercel):** connected to this repo; pushing to `main` triggers a production build. `VITE_*` env vars are set in the Vercel project settings.
- **Backend (Render):** connected to this repo; pushing to `main` triggers a Docker build from `Backend/Dockerfile`. Set all runtime env vars (`DATABASE_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `RAZORPAY_*`, `ALLOWED_ORIGINS`, ...) in the Render dashboard.

> **Secrets:** never commit real credentials. All secrets live in the Vercel / Render / Supabase dashboards. `.env` files are gitignored.

## License

Internal project. All rights reserved.
