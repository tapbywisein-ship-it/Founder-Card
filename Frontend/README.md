# FounderKey — Frontend

The React/Vite client for **FounderKey**, an event-networking platform built around the **Founder Card** — an NFC business card that founders, organizers, and attendees use to connect at startup events.

This package ships three role-based surfaces (attendee, organizer, admin), four public surfaces (landing, shareable event pages, shareable Founder Card profiles, pricing/legal), and a PWA shell. It talks to the backend in [`../Backend`](../Backend) over `/api/v1`.

## Stack

| Layer | Choice |
|---|---|
| Build / dev server | Vite 5 + SWC |
| Language | TypeScript 5 (strict) |
| UI | React 18 |
| Components | shadcn/ui on Radix Primitives |
| Styling | Tailwind CSS 3, `next-themes` for dark mode |
| State | Zustand (`appStore`) + TanStack Query for server state |
| Forms | react-hook-form + zod |
| Routing | react-router-dom v6 |
| Auth | Supabase OAuth (Google) + our own JWT for password auth |
| Realtime | socket.io-client (notifications, live attendance) |
| Payments | Razorpay checkout (loaded on demand) |
| QR scan | `@yudiel/react-qr-scanner` |
| Toasts | `sonner` |
| Tests | Vitest + Testing Library, Playwright for e2e |
| PWA | `vite-plugin-pwa` (self-destroying SW today, network-first SW planned) |

## Getting started

Requires Node.js ≥ 20 and npm ≥ 10.

```sh
# from D:/Founder-Key/Frontend
npm install

# Create .env from the example and fill in Supabase keys + API URL
cp .env.example .env

# Dev server on http://localhost:8080
npm run dev
```

### Environment variables

Variables consumed by Vite at build time (must be prefixed `VITE_`):

| Var | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | yes | Backend base URL — local: `http://localhost:3000/api/v1`, prod: `/api/v1` (same-origin via nginx) |
| `VITE_SUPABASE_URL` | yes | Supabase project URL for Google OAuth |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase publishable anon key (safe to embed) |
| `VITE_GA_ID` | no | Google Analytics 4 measurement id (gated by cookie consent) |
| `VITE_CLARITY_ID` | no | Microsoft Clarity id |
| `VITE_META_PIXEL_ID` | no | Meta Pixel id |
| `VITE_LINKEDIN_PARTNER_ID` | no | LinkedIn Insight Tag id |

## npm scripts

```sh
npm run dev         # vite dev server, port 8080
npm run build       # production build → dist/
npm run build:dev   # build with development-mode source maps
npm run preview     # preview the production build
npm run lint        # eslint
npm test            # vitest, single run
npm run test:watch  # vitest, watch mode
```

End-to-end tests use Playwright; install browsers once with `npx playwright install`, then `npx playwright test`.

## Project layout

```
src/
├─ pages/                Route components
│  ├─ attendee/          Attendee surface (Dashboard, Events, Connect, Connections, Profile, MyTickets, …)
│  ├─ organizer/         Organizer surface (Create event, Manage, Check-in, Payouts, Leads, …)
│  ├─ admin/             Admin panel (Users, Events, FounderCardReview, Analytics, Settings, …)
│  ├─ LandingPage.tsx    Public landing
│  ├─ PublicEventPage.tsx, EventDetailUnified.tsx, FounderCardPublic.tsx
│  └─ Privacy.tsx, Terms.tsx, Pricing.tsx, NotFound.tsx, AuthCallback.tsx, ClaimAccount.tsx
├─ components/           Reusable UI (AppLayout, AdminLayout, Logo, Surface, CookieConsent, …)
├─ hooks/                Data hooks (useEvents, useConnections, useMessages, useNotifications, …)
├─ services/             API + Supabase clients (auth, events, payments, connections, messages, founderCards, …)
├─ store/appStore.ts     Zustand store — user, tokens, active event
├─ lib/                  Pure utilities (analytics, useJsonLd, ticketPricing, currency, vcard, eventThemes, …)
└─ App.tsx               Router + providers
```

## The Founder Card

Every onboarded user gets a digital **Founder Card** — a QR + NFC business card with:

- A unique 6-character member id (e.g. `FK-A1B2C`) and a stable public URL `/c/:slug`
- A vCard download for "add to contacts"
- A QR/NFC handshake — scanning a card at an event sends a connection request and (if the scanner is registered) attributes a "people I met at this event" entry
- 100 FK Score points on first activation, plus a `FOUNDER` tier flag for paid features

Card-related code lives in `pages/attendee/ApplyCard.tsx`, `pages/FounderCardPublic.tsx`, `components/CardActionRow.tsx`, `services/founderCards.service.ts`, and `lib/vcard.ts`.

## Auth flow

1. Email + password registers/logs in via `/auth/register` and `/auth/login`. Tokens land in the Zustand store and `localStorage`.
2. Google OAuth runs through Supabase: the page redirects to `/auth/callback`, which exchanges the Supabase token for our own JWT via `/auth/google/verify`.
3. CSV-invited users land at `/claim/:token` and set a password to activate. The token is SHA-256 hashed at rest.
4. Forgot/reset password uses DB-backed reset tokens (also hashed). Resetting invalidates every existing refresh token.

`ProtectedRoute` guards everything; `allowedRoles` (`['admin']`, `['organizer']`, …) is checked per route. The store's `isAuthenticated` flag and the access token must agree.

## Build + deploy

`npm run build` produces `dist/`. In production the SPA is bundled into a single Docker image with the backend; nginx serves `dist/` and proxies `/api`, `/og`, `/sitemap.xml`, `/health` to the backend on `127.0.0.1:3000`. The combined image is defined by the project-root [`Dockerfile`](../Dockerfile) and deployed to Azure App Service.

Vite inlines `VITE_*` at build time, so the Docker build needs `--build-arg VITE_SUPABASE_URL=… --build-arg VITE_SUPABASE_ANON_KEY=…`.

## License

Internal project. All rights reserved.
