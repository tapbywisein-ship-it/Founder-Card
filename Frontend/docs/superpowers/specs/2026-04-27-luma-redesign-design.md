# Luma-Style Redesign — Design Spec

**Date**: 2026-04-27
**Project**: Founder Key (`golden-tap-connect` frontend + `founder-key-backend` backend)
**Status**: Approved by user via brainstorming on 2026-04-27. Implementation plan to follow.

## 1. Goal

Replace Founder Key's black-and-gold luxury aesthetic with a clean, light, minimal visual system inspired by **Luma** (lu.ma). At the same time, simplify the user-facing flows — especially event registration, signup, and event creation — to match Luma's low-friction patterns.

The redesign covers:
- Visual system (tokens, typography, spacing, shadows, motion)
- Layout shells for all four contexts (attendee, organizer, admin, marketing)
- Auth + RSVP flow simplification (magic-link signup, inline RSVP, drop onboarding/phone step)
- Page-by-page treatment for ~35 frontend pages
- Three additive backend endpoints to support magic-link auth and guest RSVP

Out of scope: changes to existing Prisma models beyond one enum value, changes to existing JWT/Google OAuth flows (additive only), i18n, test-suite rewrites, anything in `founder-key-backend` beyond the `auth` and `events` modules.

## 2. Direction Decisions

These four decisions were locked during brainstorming and frame everything below.

| Decision | Choice | Rationale |
|---|---|---|
| Mode | Light-by-default + dark toggle | "Cleanest and most attractive" feel; matches Luma's default. Dark mode kept for users who prefer it. |
| Accent | Indigo `#4F46E5` globally + per-event theme tint on event detail/manage pages | Indigo differentiates from Luma pink, Eventbrite coral, Meetup red. Per-event themes (10 presets) preserve Luma's "each event has personality" pattern. |
| FK Score / Founder Card | Quiet, integrated | No glow, no gold. FK Score becomes a Posh-style oversized mono numeral on profile. Founder Card holders show a small graphite chip beside their name. |
| Flow simplification | Match Luma exactly | Magic-link signup (no password, no role picker upfront). Inline RSVP (name + email only for guests). Single-page event create (was 5-step wizard). Tabbed organizer event manage (was 4 separate pages). Drop `/onboarding/phone`. |

## 3. Design Tokens

This is the source of truth. Everything else cascades from `tailwind.config.ts` and `src/index.css`.

### 3.1 Color (HSL, drives shadcn CSS variables)

**Light mode (default)**

| Token | HSL | Hex | Use |
|---|---|---|---|
| `background` | `0 0% 100%` | `#ffffff` | Page background |
| `foreground` | `222 13% 11%` | `#181a1f` | Primary text (Luma uses `#131517`; we use a near match) |
| `muted` | `220 14% 96%` | `#f4f5f7` | Subtle surfaces |
| `muted-foreground` | `220 9% 46%` | `#6b7280` | Secondary text |
| `card` | `0 0% 100%` | `#ffffff` | Card background |
| `border` | `220 13% 91%` | `#e5e7eb` | Hairline 1px |
| `input` | same as `border` | | Input border |
| `primary` | `239 84% 60%` | `#4f46e5` | Brand accent (indigo-600) |
| `primary-foreground` | `0 0% 100%` | white | Text on primary |
| `secondary` | `220 14% 96%` | `#f4f5f7` | Quiet surface |
| `accent` | `239 84% 95%` | indigo-tint | Hover background |
| `destructive` | `0 72% 51%` | `#dc2626` | Danger states |
| `success` | `142 71% 45%` | `#16a34a` | Success states |
| `ring` | primary @ 40% | | Focus rings |

**Dark mode (toggle)**

| Token | Value | Notes |
|---|---|---|
| `background` | `220 13% 9%` (`#131517`) | Luma's off-black |
| `foreground` | `0 0% 100%` | white |
| `card` | `rgba(255,255,255,0.04)` | translucent white surface |
| `primary` | `#4f46e5` (unchanged) | Indigo stays |
| Primary CTA | inverted: white background + black text | Luma signature for dark mode |

**Per-event accent**

Event detail and organizer event pages set a `data-event-theme` attribute on the page wrapper. A small CSS rule maps the attribute to a `--event-accent` custom property. Page background becomes `color-mix(in srgb, var(--event-accent) 6%, var(--background))`. Primary buttons within that scope re-tint to the event's accent.

Ten themes ship at launch: Indigo, Sky, Rose, Amber, Emerald, Violet, Slate, Pink, Cyan, Stone. Default = Indigo.

### 3.2 Typography

- **Stack**: `-apple-system, BlinkMacSystemFont, 'Inter Variable', Inter, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
- **Mono stack**: `'SF Mono', Menlo, Monaco, Consolas, monospace` — used for FK Score numerals (Posh-inspired typographic moment)
- **Drop entirely**: Cormorant Garamond display serif
- **Sizes**: 12 / 13 / 14 / 16 / 18 / 20 / 24 px. Maximum heading is 24px / weight 600
- **Body**: 16px / line-height 1.5
- **Compact UI**: 14px / line-height 1.3
- **No `tracking-tight`** on headings — Luma uses default letter-spacing throughout

### 3.3 Spacing & Layout

- Tailwind base spacing scale (4px unit) unchanged
- New custom max-widths on Tailwind: `max-w-content (820px)`, `max-w-wide (960px)`, `max-w-xwide (1080px)`. Stop using `max-w-7xl`.
- Default page gutter: `px-4` mobile, `px-6` tablet, `px-8` desktop

### 3.4 Radii

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 4px | Small chips, tags |
| `rounded` (default) | 8px | Buttons, inputs |
| `rounded-card` | 12px | Cards |
| `rounded-lg` | 16px | Modals (small), section containers |
| `rounded-xl` | 24px | Squircle cards |
| `rounded-modal` | 32px | Large modals |

### 3.5 Shadows — Luma's 5-layer subtle stack

```
shadow-card:
  0 1.6px  3px  rgba(0,0,0,.02),
  0 4.2px  7px  rgba(0,0,0,.03),
  0 8px    14px rgba(0,0,0,.04),
  0 17.5px 29px rgba(0,0,0,.05),
  0 48px   80px rgba(0,0,0,.06);

shadow-card-inner:
  0 -4px 4px rgba(0,0,0,.04) inset;   /* signature Luma touch */
```

Drop entirely: `gold-glow`, `gold-border-glow`, the body noise-grain SVG overlay, all gradient backgrounds.

### 3.6 Motion

- `transition-fast: 200ms`
- `transition` (default): `300ms cubic-bezier(.4, 0, .2, 1)`
- `transition-slow: 600ms`
- A single `bounce` timing variant `cubic-bezier(.54, 1.12, .38, 1.11)` for micro-delights
- Drop framer-motion's heavier page-transition reveals; keep only micro-interactions (hover, focus, simple fade-in on mount)

### 3.7 What Dies in Phase 1

CSS utility classes deleted from `src/index.css`:
- `.gold-gradient-text`, `.gold-shimmer-text`
- `.gold-gradient-bg`, `.gold-gradient-bg-subtle`
- `.gold-pill`, `.gold-input`
- `.gold-glow`, `.gold-border-glow`
- `.glass-card`, `.glass-card-hover`, `.glass-card-elevated`
- `@keyframes gold-shimmer`, `@keyframes border-sweep`
- Body noise-grain SVG overlay
- Gold-tinted `::selection`, `:focus-visible` outline, scrollbar

Files deleted entirely:
- `src/components/ParticleBackground.tsx`
- `src/components/GlassCard.tsx`

Imports removed:
- Cormorant Garamond `@import` from `src/index.css` line 1

## 4. Layout Shells

### 4.1 Attendee shell — drop the sidebar, top-nav only

```
┌────────────────────────────────────────────────────────┐
│ [FounderKey]   Discover  Events  Connect      🔍 🔔 + ⓘ │  ← 64px sticky top nav
└────────────────────────────────────────────────────────┘
       page content centered in max-w-content (820px)
       or max-w-wide (960px) for grids
```

- Sticky 64px top bar: logo · 3 horizontal links (Discover, Events, Connect) · search icon · notification bell · "+ Create" button (primary indigo, only shown if user has organizer role; for ATTENDEE-only users, the button is replaced by a "Become an organizer" link in the avatar dropdown — see §5.2) · avatar dropdown
- No sidebar. This is the single biggest perceived change to "Luma feel."
- Mobile: top bar collapses to logo + bell + avatar; bottom nav bar kept (4 items: Discover / Events / Connect / Profile — replacing the current Dashboard / Connect / Events / Network) — mobile bottom nav is the right pattern, just with new label set
- Avatar dropdown contains: Profile · Notifications · Settings · Switch role (if user has multiple roles) · Log out
- FK Score chip: small, beside the avatar; click → profile

### 4.2 Organizer shell — slim sidebar, hairline border

```
┌─────────────┬──────────────────────────────────────────┐
│ FounderKey  │ Top bar: search · bell · + Create · avatar│
│             ├──────────────────────────────────────────┤
│ Dashboard   │                                          │
│ Events      │   page content                           │
│ Attendees   │                                          │
│ Leads       │                                          │
│ Analytics   │                                          │
└─────────────┴──────────────────────────────────────────┘
```

- 240px sidebar with hairline 1px border (no glass-card, no shadows)
- Active nav item: 2px indigo left border + indigo text
- Logo at top, plain-text "Organizer" role label (no gold-pill)
- Logout at the very bottom

### 4.3 Admin shell — same slim-sidebar pattern as organizer

Six nav items: Users, Events, Analytics, Permissions, Settings (existing IA preserved). Plain-text "Admin" label. No gold-pill.

### 4.4 Inside an organizer event — sidebar OFF, tabs ON

When the organizer drills into a single event (`/organizer/events/:id`), wrap all sub-routes in a new `OrganizerEventLayout` that uses horizontal tabs:

```
[← All events]
Event title here                                        [Share] [Edit]
─────────────────────────────────────────────────────────────────────
 Overview  Registration  Guests  Blasts  Insights  Check-in
─────────────────────────────────────────────────────────────────────
   tab content
```

Tabs map to existing routes plus two new ones (Guests, Blasts):

| Tab | Route |
|---|---|
| Overview | `/organizer/events/:id` |
| Registration | `/organizer/events/:id/manage` |
| Guests | `/organizer/events/:id/guests` (new) |
| Blasts | `/organizer/events/:id/blasts` (new — Phase 3 stub if backend blast endpoint not ready) |
| Insights | `/organizer/events/:id/analytics` |
| Check-in | `/organizer/events/:id/checkin` |

### 4.5 Marketing / public pages

- New `LandingNav`: minimal top bar, transparent over hero, no glass-card
- Hero: 24–28px headline (NOT 64px display), 1-line subhead, single primary indigo CTA, soft cover image
- No particles, no shimmer, no scroll-progress bar
- Plain footer with link columns

## 5. Auth, Signup & RSVP Flows

### 5.1 Sign-up — magic link, no password, no role picker

Flow:
1. User clicks "Sign in" or "Sign up" (same flow) → `/login`
2. One field: email. One button: "Continue".
3. Backend sends magic link via `POST /auth/magic-link/request`.
4. User clicks link → `/auth/verify?token=…` → backend exchanges token for JWT → user logged in.
5. **First-login account setup** (only if `firstName` empty): one screen, three fields — first name, last name, optional avatar. No role picker. No phone. Default role = `ATTENDEE`.
6. → redirect to original destination (event page, dashboard, etc.) using the existing `loginReturnPath` mechanism.

Backward compatibility:
- Existing email/password users keep working — small "Use password instead" link on the email screen toggles to password mode.
- Google OAuth stays as-is — single "Continue with Google" button next to the email field.

### 5.2 Roles — assigned by action, not asked upfront

| Role | How a user gets it |
|---|---|
| `ATTENDEE` | Default for everyone on signup |
| `ORGANIZER` | Added when user clicks "Become an organizer" in settings, or when an admin grants it. A user can hold both ATTENDEE and ORGANIZER simultaneously; the avatar dropdown gets a "Switch view" item. |
| `ADMIN` | Internal only, never self-selected |

Kills the role-cards on `/login` and `/register`.

### 5.3 RSVP — inline, one click for returning users

Flow:
1. **Logged-in user, on event detail page**: clicks "Register" → instantly registered → button label changes to "You're going · Add to calendar". No modal, no extra step. Uses existing `POST /events/:id/register`.
2. **Logged-out user, same page**: clicks "Register" → small modal with name + email + "Continue".
3. On submit, backend `POST /events/:id/rsvp-guest`:
   - if email exists → sends magic link to confirm RSVP
   - if email is new → creates ATTENDEE account, creates `EventRegistration` with status `PENDING_CONFIRMATION`, sends magic link
4. Modal switches to "Check your email — we sent a confirmation to bob@example.com" with a `Resend` link.
5. When user clicks the email link, lands back on the event page logged in, registration promoted from `PENDING_CONFIRMATION` to `REGISTERED`.

### 5.4 Onboarding phone step — deleted

`/onboarding/phone` route + `OnboardingPhone.tsx` page → removed. Phone becomes a regular optional field in `/profile`. No mandatory steps after signup.

### 5.5 Backend endpoints (additive)

Three new endpoints + one enum value. No existing endpoints change.

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /auth/magic-link/request` | None (rate-limited) | Body `{ email }`. Generates 32-char token, stores in Redis under key `magic-link:{token}` with 15-min TTL and payload `{ email, eventId: null }`. Queues `magicLink` email job. Idempotent — same email re-requesting is fine; previous token expires naturally. |
| `POST /auth/magic-link/verify` | None | Body `{ token }`. Pops Redis key `magic-link:{token}`, returning the payload. Finds-or-creates user with `role=ATTENDEE`, `isEmailVerified=true`, `authProvider=email`. If payload `eventId` is non-null, finds the matching `EventRegistration(userId, eventId)` and promotes its status from `PENDING_CONFIRMATION` to `REGISTERED`. Returns JWT pair (same shape as existing login response). |
| `POST /events/:id/rsvp-guest` | None (rate-limited) | Body `{ email, name }`. Finds-or-creates user (sets `firstName`/`lastName` from `name` if creating, leaves `isEmailVerified=false`). Creates `EventRegistration` with status `PENDING_CONFIRMATION`. Generates a magic-link token, stores in Redis with payload `{ email, eventId }`. Queues `magicLink` email; the link is `${FRONTEND_URL}/auth/verify?token=…`. |

Schema change (`prisma/schema.prisma`):
- `RegistrationStatus` enum gains `PENDING_CONFIRMATION` value.
- Migration `add_pending_confirmation_status`.
- No data migration needed — existing rows stay valid.

Files touched in backend:
- `prisma/schema.prisma`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.routes.ts`
- `src/modules/events/events.service.ts`
- `src/modules/events/events.controller.ts`
- `src/modules/events/events.routes.ts`
- `src/utils/email.ts` (add `magicLinkEmail` template)
- `src/jobs/email.queue.ts` (add `magicLink` job type)

## 6. Page-by-Page Treatment

### Tier A — Total rewrites

**`pages/LandingPage.tsx`** — Luma-clean. Minimal nav (logo · Discover · Pricing · Sign in). Hero: 24–28px headline, 1-line subhead, single primary CTA, soft cover image. Three feature blocks in a row (hairline-bordered cards, icon + title + 1-line description). One social-proof strip ("X founders connected · Y events"). Quiet footer. Drop ParticleBackground, FounderCardMockup 3D tilt, magnetic buttons, scroll progress, shimmer headline, all gold gradients.

**`pages/LoginPage.tsx`** — Centered card, max-w 400px. Logo top. Single email input (autofocus). Primary "Continue" button. "or continue with Google" button. Tiny "Use password instead" link toggles legacy password mode. Drop role-selector cards, particle bg, glass card, stat numbers.

**`pages/RegisterPage.tsx`** — Becomes a thin redirect: `useEffect(() => navigate('/login'))`. Route stays for backward-compat inbound links.

**`pages/PublicEventPage.tsx` + `pages/attendee/EventDetail.tsx`** — Merge into one component rendered by both routes. Single 820px column layout (Luma signature):
- Cover image (16:9, full column width)
- Host avatar + "Hosted by [name]" + Subscribe link
- Event title (24px bold)
- Date-tile (44px stacked Mon/27 square) · time range
- Location row (venue + city + map link)
- Register button (full-width on mobile)
- "285 going" + 4-stack avatars
- About this event (markdown body, 1.5 line-height)
- Hosts section (host card with avatar, name, FK Score chip)
- Location section (embedded map)
- Footer (contact host · refund policy · report event)

Page background uses `--event-accent` tint via `data-event-theme`. Primary button picks up the same accent. RSVP becomes inline modal per Section 5.3.

**`pages/organizer/CreateEvent.tsx`** — Single-page form (was 5-step wizard). Two-column layout: left = cover image picker (square), right = inline-edit fields stack:
- Calendar dropdown · Public/Private toggle
- Event name (large inline edit)
- Start time / End time (overlay popovers)
- Timezone (pill)
- Add location (inline expand; offline address OR virtual link)
- Theme picker (overlay with 10 themes)
- Description (rich text)
- Event Options card: Tickets (Free/Paid), Capacity, Require approval toggle, Waitlist toggle
- "Create event" CTA at bottom (disabled until name is filled)

**`pages/organizer/OrgEventDetail.tsx` + `EventManage.tsx` + `CheckIn.tsx` + `Analytics.tsx`** — Fold into one tabbed shell (`OrganizerEventLayout` from §4.4). URLs stay live; existing inbound links keep working. New `Guests` and `Blasts` tabs added.

### Tier B — Reskins (token cascade does most of the work)

**`pages/attendee/Dashboard.tsx`** — top nav · centered max-w-content · simple greeting · 3-stat grid in plain hairline cards (FK Score in 48px mono number, no ring chart, no gold gradient · upcoming events · connections) · "Continue exploring" event row · recent notifications row. Drop SVG ring chart (replace with horizontal progress bar in dark gray), drop `gold-gradient-bg` notification badge, drop `gold-pill`, drop all glass cards.

**`pages/attendee/Connect.tsx`** — clean shadcn `Tabs` segmented control (Show QR · Scan · NFC). QR code in a plain rounded card, no `gold-glow`. Share button = primary indigo.

**`pages/attendee/Connections.tsx` + `Discover.tsx` + `Notifications.tsx`** — Standard list/table layouts with hairline-bordered rows. Empty states: small icon + 1-line text + secondary CTA. Search inputs use shadcn default (focus = solid border, no ring).

**`pages/attendee/Events.tsx`** — Mirror Luma Discover: hero "Discover Events" → category tiles (4×2 grid: Tech, Demo Days, Office Hours, Mixers, AI, Climate, Fitness, Wellness) → filter pills (Today / This week / This month / All) → event-row list (180×180 thumb · title · host · location · attendee count). Drop `gold-gradient-bg` icon circles, EventCard glass styling.

**`pages/attendee/Profile.tsx`** — centered max-w-content · avatar 96px · name 24px · 1-line bio · social links row · **FK Score in 64px mono numerals** (the Posh-inspired typographic moment) · graphite "Founder Card · Active" chip if applicable · sections for Skills, Interests, Looking For (chips), Events Hosted, Events Attending. Edit button top-right opens shadcn `Sheet` drawer.

**`pages/attendee/Gamification.tsx`** — quiet leaderboard table + badges grid + score history line chart in indigo. No glow, no celebratory animations. Opt-in deep navigation, not pushed at users.

**`pages/attendee/ApplyCard.tsx`** — simple form: 3-bullet "Why a Founder Card?" + textarea + Submit. After submit: status badge. Fancy 3D card mockup → clean static card preview component (graphite + indigo accents).

**`pages/organizer/Dashboard.tsx`** — slim sidebar shell · top "+ Create event" indigo button · 4 stat cards · upcoming events list · recent registrations row.

**`pages/organizer/Leads.tsx` + `AttendeeDirectory.tsx`** — shadcn `Table` layouts. Status pills in semantic colors (NEW = blue, CONTACTED = amber, QUALIFIED = indigo, CONVERTED = green, ARCHIVED = gray). Filter row above. Bulk actions toolbar. Drop `gold-gradient-text`, `gold-pill` FounderCard badges → graphite chips.

**`pages/admin/*` (Dashboard, Users, Events, Analytics, Permissions, Settings)** — slim sidebar shell + standard shadcn data tables/forms. Stats in clean numerals. Charts in indigo. Token cascade handles most of this.

### Tier C — Trivial / deletions

| File | Action |
|---|---|
| `pages/OnboardingPhone.tsx` + route | Deleted |
| `components/ParticleBackground.tsx` | Deleted |
| `components/GlassCard.tsx` | Deleted (replaced by `bg-card border shadow-card` directly at call sites) |
| `components/PageTransition.tsx` | Kept, simplified to a 200ms fade |
| `components/EventCard.tsx` | Reskinned: 80×80 thumb on rows / 16:9 thumb on grid, hairline border, no glass |
| `components/CategoryGrid.tsx` | Reskinned to plain category tiles |
| `components/ui/*` (shadcn) | Untouched — token cascade handles them all |

## 7. Implementation Phasing

### Phase 1 — Tokens & shell *(1–2 days, ~12 frontend files, 0 backend)*

**Goal**: app already looks Luma-like. ~70% of pages re-skin automatically because shadcn `cssVariables: true` cascades through everything.

Files touched:
- `tailwind.config.ts` — replace gold/cream blocks → indigo + neutral scale; add `max-w-content/wide/xwide`, `shadow-card`/`shadow-card-inner`, new timing functions; drop Cormorant from `fontFamily`
- `src/index.css` — replace `:root` HSL vars (light + dark mode); delete listed utility classes, keyframes, noise grain, gold selection/focus; drop Cormorant `@import`; replace `.progress-fill` and `.nav-item.active::before` with indigo
- `src/components/ui/button.tsx` — replace hardcoded `rgba(201,168,76,...)` shadows on the `gold` variant; alias `gold` → `default`/`primary`
- `src/components/Logo.tsx` — drop `.gold-gradient-text`, plain text + small mark
- `src/components/ParticleBackground.tsx` — delete file
- `src/components/GlassCard.tsx` — delete file + replace imports across ~5 call sites with `<div className="bg-card border rounded-card shadow-card p-4">`
- `src/components/AppLayout.tsx` — rewrite: drop sidebar, build top nav (logo · 3 links · search · bell · "+ Create" · avatar dropdown); mobile bottom nav simplified to 4 items
- `src/components/OrganizerLayout.tsx` — slim sidebar, drop `gold-pill`
- `src/components/AdminLayout.tsx` — same reskin
- `src/components/LandingNav.tsx` — minimal top bar, transparent over hero, drop `glass-card`
- `src/components/PageTransition.tsx` — simplify to 200ms fade
- `src/main.tsx` or `App.tsx` — add `next-themes` (or simple ThemeProvider) for dark-mode toggle, default `light`
- `index.html` — update `<meta name="theme-color">`, drop preconnect for Cormorant if any

Phase 1 acceptance:
- Boot dev server; click through every route
- Every page renders in light mode by default; no gold anywhere
- Dark-mode toggle flips the entire app
- shadcn buttons / inputs / cards rendered in indigo + neutral
- No console errors from missing classes
- No `ParticleBackground` / `GlassCard` import errors

What ships at end of Phase 1: **a Luma-looking app with all current flows still working unchanged.** Shippable to production.

### Phase 2 — Manual page polish + landing rebuild *(2 days, ~25 frontend files, 0 backend)*

**Goal**: clean up pages that hardcoded gold values (cascade can't reach them) and rebuild the marketing landing.

One-pass codemod runs first to clear mechanical bulk:
- Remove the `gold-gradient-text` class from every JSX site
- `gold-pill` → new `chip` utility (neutral graphite)
- Remove `glass-card` (rely on `bg-card border shadow-card` from §3)
- Remove `font-display` (Cormorant) — inherit body
- Replace `variant="gold"` button calls → `variant="default"`

Files touched (manual, after codemod):
- `pages/LandingPage.tsx` — total rewrite per §6 Tier A
- `pages/LoginPage.tsx` — rewrite per §6 Tier A
- `pages/RegisterPage.tsx` — replace body with redirect
- `pages/AuthCallback.tsx` — audit; should still work after token cascade; verify Google OAuth flow
- `pages/PublicEventPage.tsx` + `pages/attendee/EventDetail.tsx` — merge into one component
- `pages/attendee/Dashboard.tsx` — reskin per §6 Tier B
- `pages/attendee/Connect.tsx` — reskin
- `pages/attendee/Profile.tsx` — Posh-style 64px mono FK Score
- `pages/attendee/Events.tsx` — Luma Discover shape
- `pages/attendee/ApplyCard.tsx` — clean static card preview
- `pages/attendee/Gamification.tsx` — quiet leaderboard
- All other attendee/organizer/admin pages — bulk find/replace handled by codemod, manual touch-up where needed

Phase 2 acceptance:
- `rg "gold|cream|cormorant"` returns 0 results in `src/`
- Every page renders correctly in both light and dark
- Event detail page tints to its theme color
- Landing hero is clean Luma-style

What ships at end of Phase 2: **fully redesigned UI, all current flows still work.** Shippable to production.

### Phase 3 — Flow simplification *(2–3 days, ~10 frontend files, 6 backend files)*

**Goal**: the actual flow changes from §5.

**Backend (`founder-key-backend`)**:
- `prisma/schema.prisma` — add `PENDING_CONFIRMATION` to `RegistrationStatus` enum; migration `add_pending_confirmation_status`
- `src/modules/auth/auth.service.ts` — add `requestMagicLink(email)` and `verifyMagicLink(token)` methods
- `src/modules/auth/auth.controller.ts` + `auth.routes.ts` — new routes per §5.5
- `src/utils/email.ts` — new `magicLinkEmail({ email, link })` template
- `src/modules/events/events.service.ts` — add `rsvpGuest({ eventId, email, name })`
- `src/modules/events/events.controller.ts` + `events.routes.ts` — new route `POST /events/:id/rsvp-guest`
- `src/jobs/email.queue.ts` — add `magicLink` job type

**Frontend**:
- `src/services/auth.service.ts` — add `apiRequestMagicLink(email)` and `apiVerifyMagicLink(token)`
- `src/services/events.service.ts` — add `apiRsvpGuest(eventId, { email, name })`
- `src/pages/LoginPage.tsx` — wire email field → magic-link request → "check your email" success state
- New `src/pages/AuthVerify.tsx` (`/auth/verify`) — reads `?token=…`, calls `apiVerifyMagicLink`, stores tokens, redirects to `from` (sessionStorage) or `/dashboard`
- `src/pages/OnboardingPhone.tsx` + route — delete
- New `src/components/RsvpModal.tsx` — rendered from event detail; logged-in: one-click via existing `apiRegisterForEvent`; logged-out: collects email + name, calls `apiRsvpGuest`
- `src/pages/organizer/CreateEvent.tsx` — rewrite from 5-step wizard → single-page form per §6 Tier A
- New `src/components/OrganizerEventLayout.tsx` — wraps organizer event sub-routes with horizontal tabs
- `src/App.tsx` — wrap `/organizer/events/:id/*` in `OrganizerEventLayout`; drop `/onboarding/phone`; add `/auth/verify`; add `/organizer/events/:id/guests` and `/blasts` routes
- `src/store/appStore.ts` — drop role-picker UX state

Phase 3 acceptance:
- New user can sign up by email + magic link, no password, lands on dashboard
- Logged-in user clicks "Register" on event → instantly registered, button changes to "You're going"
- Logged-out user RSVPs by email → gets confirmation email → clicks link → registration confirmed
- Organizer creates an event in the single-page form
- Organizer event sub-pages all reachable via tabs
- Existing email/password users still log in fine
- Google OAuth still works

### Total Scope

| Phase | Frontend files | Backend files | Days |
|---|---|---|---|
| 1 — Tokens & shell | 12 | 0 | 1–2 |
| 2 — Page polish + landing | ~25 | 0 | 2 |
| 3 — Flow simplification | ~10 | 6 | 2–3 |
| **Total** | **~47** | **6** | **5–7** |

## 8. Risk & Reversibility

- **Phase 1**: single revert (one feature branch, one merge). No backend touched.
- **Phase 2**: reversible per-page. Backend untouched.
- **Phase 3**: only phase with a backend migration. The `PENDING_CONFIRMATION` enum addition is additive — rolling back the frontend while keeping the backend migration is safe. Rolling back the backend migration requires a manual SQL `ALTER TYPE` since Prisma doesn't auto-rollback enum drops.

## 9. Out of Scope

Explicitly NOT touched in this redesign:
- Existing Prisma models (no rename, no field changes beyond the one enum addition)
- Existing JWT auth (magic link is additive)
- Existing Google OAuth flow
- Backend modules other than `auth` and `events`
- Test suite (test files stay; specs may need updates if they assert on old role-picker UI — flag during Phase 3 review)
- i18n — current app is English-only and stays that way
- Mobile native apps (none exist)
- New product features unrelated to the visual rebuild and flow simplification

## 10. Acceptance — End-to-End

For the project as a whole to be considered done:

- `rg "gold|cream|cormorant|particle|glass-card"` returns 0 hits in `golden-tap-connect/src/`
- Every route in `App.tsx` renders without console errors in both light and dark modes
- A new user can sign up with email-only + magic link, complete account setup, and reach their dashboard in under 60 seconds
- A logged-out user can RSVP to a public event with name + email and confirm via email
- An organizer can create an event from the single-page form
- An organizer can navigate Overview / Registration / Guests / Blasts / Insights / Check-in for an event via tabs
- All existing email/password users continue to log in successfully
- Google OAuth continues to work
- No regressions in existing API contracts (verified via `services/*.service.ts` matching `founder-key-backend` route shapes)
