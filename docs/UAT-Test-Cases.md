# TapByWisein — UAT Test Cases

**Product:** TapByWisein (NFC networking + event platform)
**Environment:** _______________  **Build/Version:** _______________
**Tester:** _______________  **Date:** _______________

## How to use this document
- Each test case has a stable **ID** (e.g. `AT-PROF-03`) — reference it when logging bugs.
- Fill **Result** (Pass / Fail / Blocked) and **Notes / Bug ref** for every row.
- **Precondition** = state you must be in before starting the steps.
- Roles: **Attendee** = any signed-in user; **Organizer** = user with organizer/admin role; the same account can do both (only Admin surfaces are role-locked).
- Priority: **P1** = critical / blocker-if-broken, **P2** = important, **P3** = nice-to-have.

### Suggested test accounts
| Alias | Role | Purpose |
|---|---|---|
| A1 | Attendee | Primary attendee; profile, RSVP, connections |
| A2 | Attendee | Second attendee — for connection/message/endorse two-sided flows |
| O1 | Organizer | Event host |
| ADM | Admin | Card approvals, moderation (spot-check only) |

---

# PART A — ATTENDEE FEATURES

## A1. Account & Authentication

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-AUTH-01 | P1 | Email sign-up | Logged out | Go to `/register` → enter name, email, password → submit | Account created; verification email sent; redirected appropriately | | |
| AT-AUTH-02 | P1 | Email verification | Signed up, unverified | Open verification link from email | Email marked verified; can access app | | |
| AT-AUTH-03 | P1 | Login (email/password) | Verified account | `/login` → enter credentials → submit | Logged in; lands on dashboard | | |
| AT-AUTH-04 | P1 | Login with Google (OAuth) | Logged out | `/login` → "Continue with Google" → complete Google auth | Logged in and returned to intended page | | |
| AT-AUTH-05 | P1 | Wrong password rejected | Logged out | Login with correct email, wrong password | Clear error; no login | | |
| AT-AUTH-06 | P2 | Forgot password | Logged out | `/forgot-password` → enter email → submit | Reset email sent (Supabase) | | |
| AT-AUTH-07 | P2 | Reset password | Have reset link | Open reset link → set new password | Password updated; can log in with new password | | |
| AT-AUTH-08 | P1 | Registration-link return path | Logged out, have `/e/:id` link | Open event link → prompted to sign up → complete signup → login | **Lands back on the same `/e/:id` event page**, not dashboard | | |
| AT-AUTH-09 | P2 | Magic-link account claim | Received CSV-invite email | Open `/claim/:token` link | Account claimed; signed in without password | | |
| AT-AUTH-10 | P1 | Logout | Logged in | Trigger logout | Session cleared; protected routes redirect to `/login` | | |
| AT-AUTH-11 | P2 | Session expiry handling | Logged in, token expired | Trigger any authed action | Redirected to `/login` cleanly (no crash) | | |

## A2. Profile Management

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-PROF-01 | P1 | Edit basic profile | Logged in | `/profile` → edit name, bio, company, role → save | Changes persist after reload | | |
| AT-PROF-02 | P2 | Upload avatar | Logged in | `/profile` → upload image | Avatar displays across app; old avatar replaced | | |
| AT-PROF-03 | P2 | Remove avatar | Has avatar | `/profile` → remove avatar | Falls back to initials/placeholder | | |
| AT-PROF-04 | P2 | Set vanity username | Logged in | `/profile` → set username | Public card reachable at `/card/:username`; duplicate username rejected | | |
| AT-PROF-05 | P2 | Skills list | Logged in | Add/remove skills | Skills show on card; used by endorsements + matchmaking | | |
| AT-PROF-06 | P2 | "Open to" preferences | Logged in | Set Open-to badges (hiring, investing, etc.) | Badges render on public card | | |
| AT-PROF-07 | P2 | Startup pitch fields | Logged in | Fill pitch name/tagline/stage/URL | Pitch spotlight shows on card | | |
| AT-PROF-08 | P2 | Help-with / Looking-for | Logged in | Fill both sections | Sections render on card | | |
| AT-PROF-09 | P2 | View-as-visitor preview | Logged in | Open own card with `?preview=visitor` | Preview banner shows; contact details hidden as a stranger would see | | |

## A3. Digital Founder Card

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-CARD-01 | P1 | Apply for founder card | Logged in, no card | `/apply-card` → submit application | Card enters PENDING; awaits admin approval | | |
| AT-CARD-02 | P1 | Card approved → live | Admin approved card | Reload card | Card is ACTIVE; approval email received; public URL works | | |
| AT-CARD-03 | P1 | Public card view (stranger) | Card active; view logged out | Open `/c/:slug` | Card shows public info; **phone/email hidden** for non-connection | | |
| AT-CARD-04 | P1 | Public card view (connection) | A2 connected to A1 | A2 opens A1's card | A1's phone/email **visible** to A2 | | |
| AT-CARD-05 | P1 | Generate QR code | Card active | `/apply-card` or card → generate QR | QR renders and encodes card URL | | |
| AT-CARD-06 | P2 | Save contact (.vcf) — stranger | Logged out on `/c/:slug` | Click "Save contact" | vCard downloads **without** phone/email | | |
| AT-CARD-07 | P2 | Save contact (.vcf) — connection | Connected viewer | Click "Save contact" | vCard includes phone/email | | |
| AT-CARD-08 | P2 | Custom card blocks | Card active | Add/edit/delete custom blocks (links etc.) | Blocks render in order; delete removes them | | |
| AT-CARD-09 | P2 | Skill endorsements — give | A1 & A2 are **accepted connections**; A1 has skills | A2 opens A1's card → tap a skill to endorse | Count increments; A1 gets notification; tapping again un-endorses | | |
| AT-CARD-10 | P1 | Endorsement gating | A2 **not** connected to A1 | A2 opens A1's card | Endorsement counts visible but **no tap-to-endorse**; self-endorse blocked (400) | | |
| AT-CARD-11 | P2 | Card analytics | Card active, had views | `/card-analytics` | Shows views / scans / leads over time | | |
| AT-CARD-12 | P2 | Lead capture on card | Viewing someone's card | Submit "leave your details" form | Lead recorded for card owner; rate-limited against spam | | |
| AT-CARD-13 | P2 | Card view notification | A1 card active | A2 (logged in) views A1's card | A1 receives "someone viewed your card" notification | | |

## A4. NFC Tap Card (physical & DIY)

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-NFC-01 | P1 | Order physical Tap Card (₹499) | Logged in | `/apply-card` → order card → pay ₹499 (Razorpay) | Payment succeeds; order created; admin can see it for dispatch | | |
| AT-NFC-02 | P2 | DIY sticker write (Android) | Android Chrome, blank NTAG | `/connect` → write profile link to sticker | Sticker written; tapping opens card URL | | |
| AT-NFC-03 | P2 | DIY sticker (iOS fallback) | iPhone | `/connect` | Shows Shortcuts-based instructions (no Web NFC write) | | |
| AT-NFC-04 | P2 | NFC tag provisioned to card | Have NFC tag | Provision tag to own card | Tag maps to card; collision on already-used tag is rejected | | |
| AT-NFC-05 | P1 | Tap → connect | Provisioned card | Tap card on another phone | Opens `/c/:slug`; connect in one tap; counts toward FK Score | | |
| AT-NFC-06 | P3 | Landing page Tap Card CTAs | Logged out | Landing → "Get Your Tap Card" / "Write a Free Sticker" | Bounces to login, returns to `/apply-card` or `/connect` after auth | | |

## A5. Event Discovery & Registration

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-EVT-01 | P1 | Discover events | Logged in | `/discover` | Published events list; filters/search work | | |
| AT-EVT-02 | P2 | Save / unsave event | Logged in | Bookmark an event → check `/events` saved | Appears in saved; unsave removes it | | |
| AT-EVT-03 | P1 | View event detail | Published event | Open `/event/:id` or `/e/:id` | Full details, speakers, agenda, RSVP button | | |
| AT-EVT-04 | P1 | Register for free event | Free event, logged in | Register | Status CONFIRMED; confirmation email + QR ticket; **organizer gets new-registration email** | | |
| AT-EVT-05 | P1 | Register for paid event | Paid event with tiers | Select tier → pay (Razorpay) → complete | Payment captured; registration CONFIRMED; ticket issued | | |
| AT-EVT-06 | P2 | Apply coupon at checkout | Paid event with valid coupon | Enter coupon code | Discount applied; invalid/expired code rejected | | |
| AT-EVT-07 | P2 | Custom registration questions | Event with questions | Register | Must answer required questions; answers saved | | |
| AT-EVT-08 | P1 | Waitlist when full | Event at capacity, waitlist on | Register | Status WAITLISTED; no ticket yet; informed of waitlist | | |
| AT-EVT-09 | P1 | Waitlist promotion | On waitlist, spot opens | Organizer/system promotes | Status CONFIRMED; "off the waitlist" email + ticket | | |
| AT-EVT-10 | P2 | Approval-required event | Event requiresApproval | Register | Status PENDING_APPROVAL; no ticket until organizer approves | | |
| AT-EVT-11 | P1 | Guest RSVP (no account) | Logged out | `/e/:id` → RSVP with email + name | Find-or-create account; confirmation email sent | | |
| AT-EVT-12 | P1 | Cancel registration | Registered | Cancel from `/my-tickets` or event | Registration cancelled; spot freed (may promote waitlist) | | |
| AT-EVT-13 | P1 | My Tickets | Have registrations | `/my-tickets` | Lists tickets with QR; correct tier names | | |
| AT-EVT-14 | P2 | Add to calendar (.ics) | Registered | Download `.ics` / add to calendar | Valid file; correct date/time/location in calendar app | | |
| AT-EVT-15 | P2 | Event reminder email | Registered, event tomorrow | Wait for scheduler | Reminder email received day before | | |

## A6. Check-in

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-CHK-01 | P1 | Self check-in via poster QR | Registered, at event | Scan check-in QR → `/checkin/:token` | Checked in; confirmation shown | | |
| AT-CHK-02 | P2 | Check-in when not registered | Not registered | Scan check-in QR | Prompted to register / blocked appropriately | | |
| AT-CHK-03 | P3 | Duplicate check-in | Already checked in | Scan again | Idempotent — no error, shows already checked in | | |

## A7. Networking & Connections

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-CON-01 | P1 | Connect via QR scan | A1 & A2 logged in | A1 scans A2's card QR | Connection created/requested; both see it | | |
| AT-CON-02 | P1 | Send connection request | Viewing A2's card | A1 sends request | A2 receives pending request + notification | | |
| AT-CON-03 | P1 | Accept request | A2 has pending from A1 | A2 accepts | Both now connected; contact details unlock | | |
| AT-CON-04 | P2 | Reject request | Pending request | A2 rejects | Request removed; not connected | | |
| AT-CON-05 | P1 | Connections list | Have connections | `/connections` | All accepted connections listed | | |
| AT-CON-06 | P2 | Pending / Sent tabs | Sent + received requests | View pending / sent | Correct lists in each | | |
| AT-CON-07 | P2 | People I Met | Connected at an event | `/people-i-met` | Shows people met, grouped by event | | |
| AT-CON-08 | P2 | Connection suggestions | Has network | `/connections` suggestions | Relevant suggestions shown | | |
| AT-CON-09 | P2 | Follow-ups | Recent connections | Follow-ups list | Suggests who to follow up with | | |
| AT-CON-10 | P2 | Private notes on a connection | Connected | Add/edit/delete note | Note saved; private to author only | | |
| AT-CON-11 | P2 | CRM tags + reminder | Connected | Set tags + follow-up reminder | Persists; private per user | | |
| AT-CON-12 | P2 | Intro request via mutual | A1↔M↔A2 (M is mutual) | A1 requests intro to A2 via M | M receives intro request notification | | |
| AT-CON-13 | P2 | Network search | Has network | `/network-search` | Searches own network by name/company/skill | | |
| AT-CON-14 | P2 | Remove connection | Connected | Remove | Connection deleted for both | | |
| AT-CON-15 | P2 | Block a user | Any user | Block from their card/profile | Blocked user can't contact/view; appears in `/me/blocks` | | |

## A8. Messaging

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-MSG-01 | P1 | Start conversation | Connected to A2 | `/messages` → new conversation with A2 | Conversation created | | |
| AT-MSG-02 | P1 | Send & receive message | Conversation open | A1 sends → A2 opens | Message delivered; visible to both | | |
| AT-MSG-03 | P2 | Unread count | Unread messages | Check nav badge | Count matches unread; clears on read | | |
| AT-MSG-04 | P2 | New-message email/notification | A2 offline | A1 sends message | A2 gets notification (and/or email) | | |
| AT-MSG-05 | P2 | Deep link to conversation | Have conversation id | Open `/messages/:id` | Opens that thread directly | | |

## A9. Communities

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-COM-01 | P2 | Browse communities | Logged in | `/communities` | Lists communities | | |
| AT-COM-02 | P2 | Join / leave community | Viewing a community | Join then leave | Membership toggles; counts update | | |
| AT-COM-03 | P2 | Follow community | A community | Follow | Appears in following feed | | |
| AT-COM-04 | P2 | Community feed posts | Member | Create a post | Post appears in feed | | |
| AT-COM-05 | P2 | Comment on post | A post exists | Add comment; delete own comment | Comment shows; delete works | | |
| AT-COM-06 | P3 | Public community page | Have community slug | Open `/community/:slug` logged out | Public view renders | | |

## A10. Gamification (FK Score)

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-GAM-01 | P2 | View FK Score | Logged in | `/gamification` | Score + breakdown shown | | |
| AT-GAM-02 | P2 | Score increments on connect | Note score → make connection | Reload score | Score increases | | |
| AT-GAM-03 | P2 | Leaderboard | Logged in | View leaderboard | Ranked users; own rank visible | | |
| AT-GAM-04 | P3 | Badges | Earned a badge | View badges | Earned badges shown; locked ones indicated | | |
| AT-GAM-05 | P3 | Points history | Has activity | View history | Chronological point-earning events | | |

## A11. Notifications

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-NOT-01 | P1 | In-app notifications list | Has notifications | `/notifications` | All notifications listed newest-first | | |
| AT-NOT-02 | P2 | Mark one read | Unread exists | Mark as read | Item marked read; count drops | | |
| AT-NOT-03 | P2 | Mark all read | Unread exist | Mark all read | All cleared to read | | |
| AT-NOT-04 | P2 | Delete notification | Any notification | Delete | Removed from list | | |
| AT-NOT-05 | P3 | Push notifications opt-in | Browser supports push | Enable push → trigger an event | Browser push received | | |

## A12. Post-event

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| AT-POST-01 | P2 | Submit feedback / NPS | Attended an event | Submit rating + comment | Saved; can view own feedback | | |
| AT-POST-02 | P2 | Prevent double feedback | Already submitted | Re-open feedback | Shows existing / updates rather than duplicates | | |
| AT-POST-03 | P2 | Event roster (who-to-meet) | Registered | `/event/:id/attendees` | Sees attendee roster + suggestions | | |
| AT-POST-04 | P3 | Impact report (public) | Event ended | Open `/e/:id/impact` | Aggregate networking stats; shareable, no PII | | |

---

# PART B — ORGANIZER FEATURES

## B1. Organizer Dashboard & Access

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-DASH-01 | P1 | Access organizer portal | Organizer role | `/organizer/dashboard` | Dashboard loads with events + stats | | |
| OR-DASH-02 | P1 | Attendee blocked from portal | Attendee-only role | Open `/organizer/dashboard` | Access denied / redirected | | |
| OR-DASH-03 | P1 | Cross-organizer isolation | O1 & O2 each have events | O1 tries to open O2's event | Blocked — cannot see another host's event data | | |

## B2. Event Creation & Lifecycle

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-EVT-01 | P1 | Create event (draft) | Organizer | `/organizer/events/create` → fill form → save | Event created as DRAFT | | |
| OR-EVT-02 | P1 | Publish event | Draft event | Publish | Event PUBLISHED; appears in discovery | | |
| OR-EVT-03 | P1 | Edit event | Existing event | Edit details → save | Changes persist and show publicly | | |
| OR-EVT-04 | P2 | Set capacity & waitlist | Creating/editing | Set capacity, toggle waitlist | Enforced on registration (see AT-EVT-08) | | |
| OR-EVT-05 | P1 | Paid event + ticket price | Creating event | Set ticket price / tiers | Attendees see paid flow; correct amount charged | | |
| OR-EVT-06 | P2 | Require approval toggle | Creating event | Enable requiresApproval | Registrations go PENDING_APPROVAL | | |
| OR-EVT-07 | P2 | Custom registration questions | Event | Add questions | Shown to attendees at registration | | |
| OR-EVT-08 | P2 | Add speakers | Event | Add/edit speakers | Speakers show on public event page | | |
| OR-EVT-09 | P2 | Add agenda items | Event | Add agenda | Agenda shows on public event page | | |
| OR-EVT-10 | P2 | Duplicate event | Existing event | Duplicate | New DRAFT copy created; original untouched | | |
| OR-EVT-11 | P1 | Cancel event | Published event | Cancel | Event CANCELLED; attendees informed appropriately | | |
| OR-EVT-12 | P2 | Delete event | Draft/empty event | Delete | Removed; guarded if it has registrations | | |
| OR-EVT-13 | P2 | Guest RSVP link works | Published event | Open `/e/:id` logged out | Public page renders; guest RSVP available | | |

## B3. Guests & Check-in

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-GST-01 | P1 | View guest list | Event with registrations | Event → Guests tab | All registrations with status | | |
| OR-GST-02 | P2 | Approve pending registration | Approval-required event | Approve a PENDING_APPROVAL guest | Guest CONFIRMED; gets confirmation + ticket | | |
| OR-GST-03 | P1 | Check in a guest | Event day | Check-in tab → scan/mark guest | Guest marked checked-in; live count updates | | |
| OR-GST-04 | P2 | Export guest list | Has guests | Export | CSV downloads with correct rows | | |
| OR-GST-05 | P2 | Visitors (page views) | Event page viewed | Visitors tab | Lists who viewed the event page | | |

## B4. Communication (Blasts)

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-BLA-01 | P1 | Event email blast | Event with attendees | Blasts tab → compose → send | Email delivered to selected audience (all/registered/waitlist) | | |
| OR-BLA-02 | P2 | Audience targeting | Mixed statuses | Blast to "waitlist" only | Only waitlisted receive it | | |
| OR-BLA-03 | P2 | Cross-event attendee blast | Multiple events | `/organizer/attendees` → blast | Sent to selected attendees | | |
| OR-BLA-04 | P3 | Blast validation | Compose blast | Send empty subject/body | Blocked with validation error | | |

## B5. Leads

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-LED-01 | P2 | View leads | Have captured leads | `/organizer/leads` | Leads listed | | |
| OR-LED-02 | P2 | Update lead status | A lead | Change status (new/contacted/etc.) | Status persists | | |
| OR-LED-03 | P2 | Export leads CSV | Have leads | Export | CSV downloads correctly | | |

## B6. Matchmaking & Networking

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-MAT-01 | P2 | Matchmaking / who-to-meet | Event with attendees | Matchmaking tab | Suggested attendee pairings shown | | |
| OR-MAT-02 | P3 | Event analytics | Event with activity | Analytics tab | Registrations, check-ins, connections stats | | |
| OR-MAT-03 | P3 | Feedback summary | Event with feedback | Feedback summary | Aggregated NPS/ratings | | |
| OR-MAT-04 | P3 | Impact report share | Event ended | Generate/share impact report | Shareable link with aggregate stats | | |

## B7. Coupons

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-CUP-01 | P2 | Create coupon | Paid event | Coupons tab → create code + discount | Coupon active; validates at checkout | | |
| OR-CUP-02 | P2 | Delete coupon | Existing coupon | Delete | Code no longer valid | | |
| OR-CUP-03 | P2 | Coupon limits/expiry | Coupon with limits | Exceed usage / after expiry | Rejected at checkout | | |

## B8. Payouts

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-PAY-01 | P1 | Payout onboarding | Organizer, paid events | `/organizer/payouts` → onboard (Razorpay route) | Linked account created | | |
| OR-PAY-02 | P1 | View payouts / earnings | Has paid registrations | Payouts page | Correct totals (no string-concat / decimal bug) | | |
| OR-PAY-03 | P2 | Payout data loads timely | Payouts page | Open page | Loads within acceptable time; no perpetual skeleton | | |

## B9. Communities (Organizer)

| ID | Priority | Test Case | Precondition | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|---|
| OR-COM-01 | P2 | Create community | Organizer | `/organizer/communities` → create | Community created | | |
| OR-COM-02 | P2 | Edit community | Own community | Edit details | Changes persist | | |
| OR-COM-03 | P2 | Invite members | Own community | Invite by email | Invitations sent | | |
| OR-COM-04 | P2 | Post announcement | Own community | Announce | Announcement broadcast to members | | |
| OR-COM-05 | P2 | Moderate posts | Community with posts | Delete a member post | Post removed | | |

---

# PART C — CROSS-CUTTING (do on multiple devices/browsers)

| ID | Priority | Test Case | Steps | Expected Result | Result | Notes |
|---|---|---|---|---|---|---|
| CC-01 | P1 | Mobile responsive | Load key pages on a phone (375px) | No horizontal scroll; tappable targets; readable | | |
| CC-02 | P2 | Dark / light theme | Toggle theme across app | Consistent, readable in both | | |
| CC-03 | P2 | Landing page scroll | Scroll landing top→bottom | Sections fade in before visible; **no blank white frames** | | |
| CC-04 | P2 | Landing nav links | Click Discover / Pricing / FAQ | Navigate/scroll to correct section | | |
| CC-05 | P1 | Deep-link while logged out | Open a protected link logged out | Bounce to login, return after auth | | |
| CC-06 | P2 | Browser back/forward | Navigate then back/forward | State preserved; no crash | | |
| CC-07 | P1 | Error/empty states | View pages with no data (0 events, 0 connections) | Friendly empty states, not errors | | |
| CC-08 | P2 | Cookie consent | First visit | Consent banner; declines respected | | |

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| UAT Tester | | | |
| Product Owner | | | |
| Engineering | | | |

**Overall result:** ☐ Pass ☐ Pass with issues ☐ Fail
**Blocking issues (P1 fails):** _______________________________________________
