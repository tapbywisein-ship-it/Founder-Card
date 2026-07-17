# TapByWisein — Feature List

Complete inventory of shipped features by role, grounded in the actual routes, modules, and controllers. Last updated 2026-07-15.

Roles: **Attendee** = any signed-in user. **Organizer** = attendee who self-upgraded (instant, free). **Admin** = role-gated platform staff. The same account can attend and organize; only Admin surfaces are role-locked.

---

## 👤 Attendee

### Account & authentication
- Email sign-up / login
- Google OAuth (with return-path preservation through signup)
- Forgot / reset password, email verification (Supabase Auth)
- Magic-link account claim from CSV-invite emails
- Logout, session-expiry handling

### Profile
- Edit name, bio, company, position, avatar, skills, interests, LinkedIn
- Vanity username → public card at `/card/:username`
- "Open to" badges (hiring, investing, mentoring, etc.)
- Startup pitch: name, tagline, stage, URL
- Help-with / looking-for sections
- View-as-visitor preview (`?preview=visitor`)

### Digital & NFC card
- Apply for a Founder Card (admin-approved)
- QR code generation
- Public card view (`/c/:slug`) with contact-gating — phone/email hidden from non-connections
- "Save contact" → `.vcf` download (gated the same way)
- Custom card blocks (links / sections)
- Card analytics — views, scans, leads over time
- Lead-capture form on your card (rate-limited against spam)
- "Someone viewed your card" notification
- NFC Tap Card: order physical card (₹499) or write a DIY sticker; tap-to-connect

### Events — discovery & registration
- Discover / search events by category
- Save / bookmark events
- Event detail with speakers, agenda, registration link
- Register: free, paid (Razorpay + ticket tiers), coupons, custom registration questions
- Waitlist (auto-promotion), approval-required events
- Guest RSVP (no account — find-or-create by email)
- Cancel registration
- My Tickets with QR code
- Add to calendar (`.ics`)
- Event reminder emails
- Self check-in via poster QR

### Networking & connections
- Connect via QR scan or NFC tap
- Send / accept / reject connection requests
- Connections list, People I Met (grouped by event)
- Pending / sent requests, connection suggestions, follow-ups
- Private notes + CRM tags & follow-up reminders per connection
- Intro requests via mutual connections
- Network search (across your own network)
- Block users

### Messaging
- Direct conversations, send/receive messages
- Unread counts, deep-link to a conversation
- New-message notification / email

### Communities
- Browse / join / leave / follow communities
- Community feed posts + comments
- Public community pages (`/community/:slug`)

### Gamification & notifications
- FK Score (points + breakdown), leaderboard, badges, points history
- In-app notifications (mark read/all, delete)
- Web push notifications

### Post-event
- Feedback / NPS submission
- Event roster (who-to-meet) for registered attendees
- Shareable networking impact report (aggregate, no PII)

---

## 🎤 Organizer

Everything an attendee has, plus:

### Event lifecycle
- Create event (Luma-style — renders for signed-out visitors, submit is gated)
- **Edit event** (reuses the create form in edit mode)
- Duplicate event into a fresh draft
- Publish a draft; cancel a published event (notifies + refunds)
- Delete a draft
- Configure: capacity, waitlist toggle, paid ticket tiers, require-approval, custom registration questions, speakers, agenda, co-hosts

### Per-event management (tabs)
- **Overview** — status, key stats, share link, feedback summary
- **Guests** — full roster; approve/deny pending, check-in, refund, set attendee roles, CSV import, sorting
- **Visitors** — who viewed the event page but didn't register
- **Blasts** — email attendees (audience: all / registered / waitlist) + blast history
- **Coupons** — create/delete % discount codes with usage limits
- **Insights** — registrations, check-ins, seniority mix, networking stats
- **Matchmaking** — curated attendee-pair intros ranked by overlap
- **Check-in** — QR scan + manual + live refetch
- **More** — edit, duplicate, export CSV, cancel/delete, questions/speakers/co-hosts editors

### Portal-level
- Dashboard (events + aggregate stats)
- Attendee directory across all events + cross-event email blast
- Leads — view, update status, export CSV
- Payouts — Razorpay Route onboarding (KYC), earnings by event, recent transfers, auto-split on sale
- Communities — create/edit, invite members, post announcements, moderate posts
- Instant self-serve organizer upgrade

---

## 🛡️ Admin

### User management
- List / search users
- User detail + activity log
- Update user, change role, set status
- **Ban** user, delete user, resend invite

### Events & content
- List all events, edit any event, delete any event
- **Founder Card review** — approve / reject / deactivate / reactivate applications

### Platform
- Dashboard (platform-wide metrics)
- Analytics (platform analytics)
- **Revenue** — orders & earnings
- **Order fulfillment** — mark physical-card orders dispatched / delivered
- Permissions — view / update role permissions
- Settings — platform config, update settings, send test email
- Audit logs — admin action history
- Health check endpoint

---

## 🔧 Platform-wide (all roles)

- NFC Tap Card infrastructure (provision, read, physical purchase & dispatch)
- Payments: Razorpay + webhooks (signature-verified)
- Transactional email (Resend): welcome, ticket confirmation, reminders, blasts, recaps, waitlist-promoted, new-registration, connection-request, card-approved
- Auth: Supabase (JWT), role-based access, ownership checks
- Real-time: Socket.IO (messages, notifications) with Redis adapter
- Background jobs: Bull email queue + Redis; cron reminders/recaps
- SEO: sitemap, OG images, per-route titles
- PWA: installable (Add to Home Screen), service worker
- Dark / light theme (true-black dark mode)

---

_See also: [UAT-Test-Cases.md](UAT-Test-Cases.md) · [CODEBASE-AUDIT.md](CODEBASE-AUDIT.md)_
