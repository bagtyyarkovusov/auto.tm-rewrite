# 84 — Launch plan (cutover from build to live)

> This is the **public soft-launch** runbook, not the S8 private-beta gate. ADR-0027 narrows the first release to an MLP beta; S8 proves the loop with 10-50 invited users. Use this document after the MLP beta retro decides which post-MLP bets must exist before a wider public launch.

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

## Private beta phase (S8, before public launch)

Goal: shake out bugs with a small known cohort before everyone arrives.

- Cohort: 10-30 invited users (friends, family, sympathetic dealers)
- Distribution: TestFlight (iOS), Internal Testing (Google Play), or direct APK
- Feedback channel: dedicated Telegram group with AutoTM team
- Daily standup-style review of feedback during beta
- Bug fix window: anything serious gets a hotfix before public launch or blocks launch entirely

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

- [Phase plan](../02-phases.md)
- [Deployment runbook](80-deployment-runbook.md)
- [Monitoring + alarms](81-monitoring-alarms.md)
- [Incident template](82-incident-template.md)
- [Launch analytics + scaling plan](85-launch-analytics-plan.md)
- [Vision metrics](../00-vision.md)
