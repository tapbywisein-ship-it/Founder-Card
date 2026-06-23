# FounderKey

**FounderKey** is an event-networking platform built around the **Founder Card** — an NFC + QR business card that founders, organizers, and attendees use to connect at startup events. Scan a card, send a connection request, message in-app, and walk away with a real CRM of every person you met.

This repo holds the two halves of the platform plus the combined deploy artifacts.

```
D:\Founder-Key\
├── Frontend\         React/Vite SPA (attendee, organizer, admin, public)
├── Backend\          Express/Prisma API + socket.io + email + payments
├── deploy\           nginx + supervisord configs, docker-compose generator
└── Dockerfile        Single-image build: nginx serves the SPA + proxies /api to Node
```

Frontend and Backend each have their own README with stack details, env vars, and project layout:

- [`Frontend/README.md`](Frontend/README.md)
- [`Backend/README.md`](Backend/README.md)

## What the platform does

| Surface | Who | What they do |
|---|---|---|
| Attendee | Anyone who signs in | Discover events, RSVP / buy tickets, scan cards to connect, message, track their FK Score and badges |
| Organizer | Anyone who signs in | Create + manage events, ticket tiers, CSV-invite guests, check-in, email blasts, leads, payouts |
| Admin | Platform staff | Users (role / status / ban / delete with last-admin guard), events, founder-card review, audit log, analytics, settings |
| Public | Anyone | Landing, shareable event pages (`/e/:slug`), shareable Founder Cards (`/c/:slug`), pricing, legal |

### The Founder Card

Every onboarded user gets a **Founder Card** — a unique member id (`FK-XXXXX`), a QR code, a vCard download, and a public profile at `/c/:slug`. Scanning another card at an event sends a connection request, attributes a "people I met here" entry, and awards both sides FK Score points.

## Architecture at a glance

```
                ┌──────────────────────────────────────────┐
Browser  ─▶ nginx :80 ──▶ static SPA (Vite dist)            │
                │                                            │
                └─▶ /api  /og  /sitemap.xml ─▶ Node :3000   │
                                                  ▲          │
                                                  │ Prisma   │
                                                  ▼          │
                           Supabase Postgres + Redis + SMTP  │
                                                              │
                       Razorpay (REST), Supabase Auth (Google OAuth)
```

Both processes run inside one Docker container managed by `supervisord` (see [`deploy/supervisord.conf`](deploy/supervisord.conf)). The image is built from the project-root [`Dockerfile`](Dockerfile) and deployed to Azure App Service for Linux as a single container.

## Quick start (local dev)

You'll run the Frontend and Backend as two separate dev processes; nginx is only used in production.

```sh
# 1) Backend on :3000
cd Backend
npm install
cp .env.example .env            # fill in DATABASE_URL, JWT secrets, SMTP, Supabase, ...
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

## Build the combined image

```sh
docker build \
  --build-arg VITE_SUPABASE_URL=https://<your-project>.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=<anon-key> \
  -t <your-registry>/founderkey:latest .

docker push <your-registry>/founderkey:latest
```

`deploy/gen-compose.js` regenerates `docker-compose.yml` with the right runtime env baked in:

```sh
IMAGE=<your-registry>/founderkey:latest \
  PUBLIC_URL=https://<your-host> \
  node deploy/gen-compose.js
```

## Deploy

The Azure App Service (Linux, single-container) is configured to pull this image. Restart after each push:

```sh
az webapp restart --name <site> --resource-group <rg>
```

The backend warms in ~30s; nginx serves the SPA immediately.

## License

Internal project. All rights reserved.
