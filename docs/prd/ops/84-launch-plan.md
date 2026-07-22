# 84 — Launch plan (cutover from build to live)

> This is the **store-verification → TM cutover → public soft-launch** runbook. [ADR-0039](../../adr/0039-phased-cloud-first-hosting.md) re-sequences the path: reviewer-only Railway production comes first, both stores approve, and only then does production cut over to the ADR-0005 TM topology before real TM users are invited. Railway production never serves the public marketplace.

## Pre-launch milestones

Before announcing publicly, all of these must be green:

### Engineering

- [ ] S1-S8 MLP beta scope shipped and smoke-tested
- [ ] Any post-MLP features required for public soft launch explicitly shaped and shipped
- [ ] Public soft-launch e2e tests passing
- [ ] First 5 OTP phones provisioned + tested in real prod with real SIMs
- [ ] Contact flow works reliably on physical Android + iOS devices; FCM/APNS push is required only if direct-message push has been shaped before public soft launch
- [ ] Backup + restore tested (do a full restore drill on a staging DB before launch)
- [ ] Observability stack live; alerts firing to Telegram during a drill
- [ ] TLS certs issued + auto-renewal proven via dry run
- [ ] At least 1 successful air-gap deploy from build runner to TM servers

### Content / data

- [ ] Catalog seeded: 100+ brands, 5000+ models, regions + cities + colors + body types complete
- [ ] First 10-20 "seed" listings created by AutoTM staff (so anonymous browsers see content from day 1)
- [ ] At least 10-20 real seller listings seeded; verified dealerships are required only if the dealership bet has shipped
- [ ] Privacy Policy + Terms of Service published in RU + TK + EN

### Compliance (public app-store launch)

- [ ] Apple Developer account: paid, verified
- [ ] Google Play Console: account active
- [ ] iOS app submitted + approved
- [ ] Android app submitted + approved
- [ ] Account deletion flow verified by Apple reviewers (common rejection point)
- [ ] Sign-in-with-Apple **not** required (we only use phone OTP, not OAuth)

### Ops

- [ ] At least 2 people have TOTP-enrolled admin accounts (in case one is unreachable)
- [ ] On-call rotation defined (even if just one person, document the schedule)
- [ ] Telegram alert channel created + verified
- [ ] Incident response runbook reviewed
- [ ] Moderation smoke passes in a prod-like environment: public report -> TOTP-elevated admin action -> audit row visible -> public enforcement visible
- [ ] Report entry/admin moderation visibility pause flags are tested
- [ ] AutoTM company phone / email for user support set up

## App + update delivery by era

ADR-0039 changes the sequence without changing ADR-0029's eventual TM delivery design.

- **Railway/store-verification era:** EAS Build produces binaries for TestFlight and Play tracks. The app has no `updates.url`; every JS/native change requires a new binary. Railway-generated API domains may be used for staging/internal builds only. Before the first store-candidate production binary, register the stable AutoTM-owned domain and point its API/media hosts at Railway so the later TM cutover is a DNS flip rather than an app rebuild.
- **Reviewer access:** 3–5 reserved, unissueable `+993` demo accounts (ADR-0030 as amended by ADR-0039), with at least a buyer + seller pair. They have normal privileges only, are rate-limit-exempt, flag-gated, audited, and documented only in store review notes/operator secret storage. Seeded content must exercise listing creation, rich chat, report/block, and moderation between distinct identities.
- **TM era:** after store approval and TM cutover, direct APK fallback and the ADR-0029 first-party Expo Updates server can be implemented. OTA remains deferred until that era; it is not a store-verification dependency.

## Launch-prep checklist (sequenced)

### Human gates — start early

- [ ] Register **Apple Developer (organization)**; D-U-N-S/identity verification can take weeks.
- [ ] Register **Google Play Console (organization)**; verify current organization/testing policy in-console.
- [ ] Register `auto.tm` or the approved fallback before the first store-candidate production binary.
- [ ] Reserve 3–5 demo `+993` identities that can never be issued to real users; keep credentials outside git.

These steps can cost money or create external legal accounts and therefore require explicit founder action. Agents may document or verify them but must not create/purchase them implicitly.

### Shipped software foundation

- [x] S7 moderation/report/block and admin enforcement path.
- [x] S8a legal pages RU/TK/EN, account deletion, localized marketplace loop, Favorites, and MLP/admin smokes.
- [x] S10 rich chat, chat safety, and the native direct-message push decision/queue path. Real FCM/APNS delivery remains a Sprint 11 gate.

### Sprint 11 — Railway deployment + store-review readiness

- [ ] Railway staging auto-deploys `main` only after GitHub Actions passes; production is manual promotion/deploy only.
- [ ] API, worker, admin, web, Postgres, Redis, and MinIO run in both Railway environments; SMS/phone services are excluded.
- [ ] Reviewer bypass supports 3–5 buyer/seller demo accounts and seeded review content while public signup remains disabled.
- [ ] Production FCM/APNS delivery is proven on physical Android + iOS.
- [ ] EAS staging/production profiles exist; the production profile refuses a missing/invalid stable API URL and configures no OTA URL.
- [ ] Staging and production reviewer-path smokes pass; rollback and Postgres + media restore drills are recorded.
- [ ] Railway production confirmation pass covers auth, listing create, rich chat, report → moderation, and push.

### Sprint 12 — human-led store submission

- [ ] Complete App Store Connect and Play Console metadata, privacy declarations, age/content ratings, screenshots, support URLs, and review notes.
- [ ] Build the production binary against the stable AutoTM-owned API domain.
- [ ] Submit iOS and Android; respond to review without enabling real-user signup or real SMS.
- [ ] Both stores approve.

### TM cutover gate — all required

- [ ] Both stores approved.
- [ ] Railway production confirmation pass repeated successfully.
- [ ] Trusted TM presence/helper available.
- [ ] TM hardware racked and the ADR-0005 deployment, TLS, monitoring, rollback, and restore path proven.
- [ ] Stable domain DNS flips to TM; app binary remains unchanged.
- [ ] Railway production is torn down; Railway staging remains and contains no real TM user data.

### Closed beta after TM cutover

- [ ] Verify real TM OTP/SIM delivery and Play/TestFlight reachability on TM networks; publish direct-APK fallback if needed.
- [ ] Invite 10–50 real TM testers; reviewer bypass remains separate from real-user auth.
- [ ] Run the feedback/support cadence and block public launch on serious defects.
- [ ] Shape and deploy self-hosted OTA only as TM-era work; do not assume it exists at beta start.

### Public launch

- [ ] Follow the pre-launch milestones and launch-day sequence below.
- [ ] Keep real-user signups disabled until TM production, support ownership, monitoring, moderation, and rollback gates are green.

## Public launch day

### Morning

- [ ] Final smoke test on production
- [ ] Verify backup taken < 4h ago
- [ ] Confirm all 5 OTP phones healthy
- [ ] Telegram channel ready for alerts

### Launch sequence

1. **9:00 TM time** — flip the public web to live (remove "coming soon" banner if any)
2. **9:00** — release announcements queued in admin if broadcast tooling has shipped; otherwise prepare Telegram/support-channel copy
3. **10:00** — verify everything still healthy
4. **10:00** — notify the beta cohort / early users through the shipped channel: "We're live!"
5. **Through the day** — monitor every 30 min; respond to incoming reports fast
6. **End of day** — write a launch retrospective

### Communication channels

| Audience | Channel | Frequency |
|---|---|---|
| Internal team | Telegram ops channel | Real-time |
| Beta users | Dedicated Telegram group | Ad-hoc |
| Public users (post-launch) | Admin broadcast inside app | Major events only |
| Press / community | Optional Instagram / Telegram posts | At founder's discretion |

## Things that WILL go wrong on launch day (plan for them)

- **OTP delivery slow** — one phone might struggle under sudden load. Have a spare ready.
- **Notification delays** — if native push has shipped, first few hundred users registering tokens may lag
- **Image upload failures** — slow Telecom backbone may cause some upload retries
- **Unexpected admin reports** — first scammers will probe within hours; have your moderation queue ready
- **Server load** — should be fine given 5-phone capacity, but monitor CPU + memory closely
- **A bug nobody saw** — guaranteed; have a rollback plan ready

## Rollback plan

If launch day is going badly:

1. **Soft pause** — admin broadcast: "We're addressing an issue; please wait"
2. **Disable signups** — set `SIGNUPS_ENABLED=false` to block new account creation from OTP verification while existing users/admins can still log in
3. **Pause new supply** — set `LISTING_PUBLISH_ENABLED=false` to block publishing new listings while existing listing reads and draft editing remain available
4. **Disable listing mutations** — set `LISTING_MUTATIONS_ENABLED=false` to make owner listing routes read-only (public browse/detail and contact stay governed by their own flags)
5. **Disable contact** — set `CONTACT_ENABLED=false` to block new conversation opens/message sends while existing conversation history remains readable
6. **Pause moderation exposure** — set `REPORT_ENTRY_ENABLED=false` to hide/block public report creation, or `ADMIN_MODERATION_ACTIONS_ENABLED=false` to block admin dismiss/ban/unban/suspend/unsuspend writes while admin report/audit reads remain available
7. **Last resort: full rollback** — revert to previous Docker images using `./rollback.sh`

MLP flags are server-side environment/deployment config; API enforcement is authoritative and UI hiding is secondary. Disabled feature writes return HTTP 403 `FORBIDDEN` with `details.reason = "FEATURE_DISABLED"` and must not expose internal flag names. Runtime DB-backed/admin-managed flags are post-MLP unless beta operations prove redeploy/restart-based config is too slow.

## Post-launch (week 1)

- Daily metrics review:
  - DAU
  - New listings posted
  - Active listings by city
  - Search demand by city; saved-search demand only if saved searches have shipped
  - Conversations started
  - Contact starts by listing city; favorites only if favorites have shipped
  - OTP success rate
  - Push delivery rate only if native push has shipped
  - Bug reports
- Daily admin moderation review
- City planning action: compare demand by city against active supply by city; use gaps to prioritize catalog cleanup, dealer outreach, and launch expansion. Do not introduce GPS prompts or radius search as a launch-day fix; that decision is locked in [ADR-0022](../../adr/0022-city-first-listing-location.md).
- Weekly retrospective in week 2

## Post-launch (month 1)

- Capture user feedback systematically (in-app feedback form or documented support channel)
- Plan Phase 2 with what we've learned
- Re-evaluate the 12-month success metrics from [00-vision.md](../00-vision.md)

## References

- [ADR-0039 — Phased cloud-first hosting](../../adr/0039-phased-cloud-first-hosting.md)
- [Sprint 11 — Railway deployment](../sprints/sprint-11-railway-deployment.md)
- [Phase plan](../02-phases.md)
- [Deployment runbook](80-deployment-runbook.md)
- [Monitoring + alarms](81-monitoring-alarms.md)
- [Incident template](82-incident-template.md)
- [Launch analytics + scaling plan](85-launch-analytics-plan.md)
- [Vision metrics](../00-vision.md)
