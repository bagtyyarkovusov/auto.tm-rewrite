# 40 — Admin Dashboard

## Summary

Internal-only Next.js dashboard at `admin.auto.tm` for moderation, user management, dealership verification, broadcast notifications, SMS gateway health, catalog editing, and (Phase 2) inspection reports.

## Why it exists

Bagtyýar (the admin persona) needs to:
- Find and act on reported listings before they harm users
- Verify dealerships so the PRO badge means something
- Send announcements to users about new features or outages
- Confirm the SMS gateway is healthy (5 phones humming = OTPs flowing)
- Maintain catalog data (new car models, regions, colors)
- Audit who did what

A mobile admin UI would be cramped. Desktop web with shadcn/ui gives the room and density admins need.

## What it does (user-visible behavior)

### Login

- Phone OTP entry (same flow as mobile users, sent via same SMS gateway)
- After OTP success: TOTP code entry (Google Authenticator)
- On success: JWT in HTTP-only cookie, role checked on every request

### Dashboard

- Overview cards:
  - **Active listings** count + 7-day trend
  - **Pending moderation** (reports awaiting review)
  - **Pending verifications** (dealerships awaiting review)
  - **SMS gateway health** (X of N phones connected, error rate)
  - **DAU / WAU** (active users)
  - **City supply / demand** (active listings, searches, saved searches, favorite/chat/call starts by listing city; no raw GPS)
- Recent activity feed (5 latest admin actions)

### Listings moderation

- List page with filters: status (active/sold/reported/banned), region, brand, posted date range
- Search by listing ID or title
- Tap listing → full detail view + moderation toolbar:
  - **Ban** with reason picker (spam / scam / wrong category / etc) and free-text reason
  - **Unban**
  - **Hide from feed** (archive)
  - **Edit metadata** (admin override — used sparingly)
- Every action writes to audit log

### Users

- List + search by phone, name, email
- Tap user → detail: phone, role, listings, conversations, login history
- Actions: Suspend / Unsuspend (with reason)
- Cannot delete users in MVP (preserve audit trail and conversation history)

### Dealerships

- List of dealerships, sortable by verified status / tenure
- Tap → detail: logo, members, listings, contact, hours
- Actions: Verify (set `verifiedAt`) / Unverify / Edit metadata
- Add member (by phone, sends invite SMS)

### Broadcast notifications

- "New notification" page:
  - Title (RU / TK / EN)
  - Body (RU / TK / EN)
  - Target: All users / Specific user / Brand subscribers / Saved-search subscribers / TOPIC name
  - Optional deep link
  - `Important` flag (bypasses category mute — use sparingly)
- Preview shown
- Send → fans out via worker queue → records `NotificationHistory`
- History page:
  - List past notifications
  - Each shows: title, sent date, recipients, delivered, failed, success rate
  - Click → detail with per-recipient delivery log

### SMS gateway health

- Per-phone view: ID, label, connected status (green/red), last successful send, today's send count, error rate, SIM credit (manually updated)
- Recent SMS log: phone number sent to (masked), OTP request ID, phone used, status, timestamp
- Per-phone actions: mark inactive / re-enable / view detailed log

### Catalog editor

- Brands list with logo + trilingual names
- Click brand → edit form (3 name fields, slug, logo upload, isActive)
- Add new brand button
- Similar for Models (scoped to Brand) / Generations / Colors / Regions / Cities / Body types / Engine types / Transmissions / Drive types

### Audit log

- Searchable list of all admin actions
- Filter by: actor (admin user), action type, target type, date range
- Detail view shows before/after JSON diff
- Export to CSV

### Phase 2 additions

- `/reports/*` — inspection reports CRUD
- `/rubric` — rubric template editor (versioned)

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Login | OTP entry | Admin-specific look, no marketing chrome |
| Login | TOTP entry | After OTP success |
| Dashboard | Default | Overview cards + activity |
| Dashboard | Gateway unhealthy | Red banner: "SMS gateway: 2 of 5 phones down" |
| Listings | Default | Table with filters |
| Listings | Filtered to reports | Reports flagged with red badge |
| User detail | Suspended | Red banner + Unsuspend button |
| Broadcast composer | Default | Form + preview |
| Broadcast composer | Targeting all users | Warning: "This will notify {count} users" — require confirm |
| Audit log | Default | Table with filter chips |

## Data references

- `apps/api/src/modules/admin/CONTEXT.md` — audit log, content reports
- All other contexts' admin endpoints

## Decisions

- [ADR-0006](../../adr/0006-auth.md) — Admin OTP + TOTP 2FA
- [ADR-0001](../../adr/0001-architecture.md) — Admin operations as their own context
- [ADR-0022](../../adr/0022-city-first-listing-location.md) — City-level location analytics only; no raw GPS in MVP
- [ADR-0023](../../adr/0023-first-party-product-analytics.md) — First-party product analytics for MVP

## Phase

**Phase 1.** (Phase 2 adds reports module.)

## Out of scope

- Mobile admin (defer indefinitely; desktop is fine for admin workload)
- Admin role hierarchy (super-admin vs moderator) — single admin role for MVP
- Read-only admin accounts (e.g., support team that can view but not modify) — defer
- A/B testing tools — never planned
- Full-fledged CMS (blog editorial workflow) — admins post via the regular blog UI for now

## Open questions

- Should admins be able to impersonate users for support? (High value, high abuse risk — defer)
- Bulk operations (e.g., "ban all listings from this user") — likely needed eventually
- Admin notification preferences for incoming reports — alerts via Telegram via TM Proxy PC (covered in [ADR-0010](../../adr/0010-testing-obs.md))
