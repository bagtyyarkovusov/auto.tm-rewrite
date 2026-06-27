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
- Distribution: store tracks (TestFlight + Play closed/internal) with **direct-APK fallback**; updates via **self-hosted OTA** — see "App + update delivery" below ([ADR-0029](../../adr/0029-self-hosted-ota-air-gap-delivery.md))
- Feedback channel: dedicated Telegram group with AutoTM team
- Daily standup-style review of feedback during beta
- Bug fix window: anything serious gets a hotfix before public launch or blocks launch entirely

## App + update delivery (self-hosted OTA + hybrid)

Locked in [ADR-0029](../../adr/0029-self-hosted-ota-air-gap-delivery.md) (delivery) and [ADR-0030](../../adr/0030-reviewer-demo-account-otp-bypass.md) (review access).

- **Binary / initial install — hybrid.** Store tracks for legitimacy and the public path (Google Play closed/internal testing, Apple TestFlight), with **direct-APK download as the TM fallback** — and the primary Android path if Play is throttled on Telecom. Test Play/TestFlight reachability on a real TM SIM before relying on them.
- **Updates — self-hosted OTA inside TM.** The app's `updates.url` points at a first-party Expo Updates server (`updates.auto.tm`); bundles live in the existing MinIO; manifests are code-signed (private key in TM, public cert in the build). No runtime dependency on EAS Update cloud. This is the iteration lever: JS/asset fixes ship over-the-air with no store re-review.
- **OTA covers JS/assets only.** Native changes (new native module, SDK bump, new permission, the deferred video pipeline) require a fresh binary + bumped `runtimeVersion` — not an OTA.
- **Channel discipline.** The beta cohort is pinned to a stable OTA channel; parallel/dev work uses a separate channel and is never pushed to the beta channel mid-test.
- **Reviewer access.** Store reviewers (abroad, no `+993` SIM) authenticate via the single reserved fixed-OTP demo account (ADR-0030): normal privileges only, rate-limit-exempt, flag-gated, audited; the reserved number + code go only in App Store Connect / Play review notes. Seeded demo content lets a reviewer exercise post / contact / report / block for Apple Guideline 1.2.

## Launch-prep checklist (sequenced)

The path from "MLP done" to public launch. Tracked here in the launch plan (intentionally **not** broken into separate issues yet).

> **Store accounts are NOT created yet** (Apple Developer + Google Play Console). They are the long pole — organization accounts need identity / D-U-N-S verification that can take weeks. **Register them first**; everything store-side blocks on them.

**Now (parallel to S6–S7)**

- [ ] Register **Apple Developer (organization)** — needs a D-U-N-S number. *Not created yet.*
- [ ] Register **Google Play Console (organization)** — an org account avoids the personal-account closed-testing-before-production gate (verify the current Play policy in-console). *Not created yet.*
- [ ] Reserve the demo `+993` number (ADR-0030); never issue it to a real user.

**S7 (moderation sprint — already planned)**

- [ ] Ship moderation / report / block — also the Apple Guideline 1.2 UGC gate for the public step.

**S8 (private-beta sprint — already planned)**

- [ ] Self-hosted OTA server live (`updates.auto.tm`, code-signing keys, bundles in MinIO) — ADR-0029.
- [ ] Hardened reviewer demo account (ADR-0030) + seeded demo content.
- [ ] Legal pages RU/TK/EN + account-deletion grace period (S8 children #2/#3).
- [ ] Binary built (EAS Build); Play closed track + TestFlight set up; APK fallback published.
- [ ] Beta cohort pinned to a stable OTA channel.

**Closed beta (~2–4 weeks, after S8)**

- [ ] 10–50 real TM testers invited (real OTP); reviewer uses the bypass.
- [ ] Iterate via self-hosted OTA (JS-only, no native changes mid-beta).
- [ ] Feedback via dedicated Telegram group.
- [ ] Parallel work limited to launch prep + trust-pilot prep; saved searches, engagement layer, and expensive bets deferred to the Phase 1 retro / betting table (ADR-0027, ADR-0037).

**Public launch (after the Phase 1 retro picks bets)**

- [ ] Submit App Store + Google Play production (demo account for review, S7 moderation, legal, account deletion).
- [ ] Follow the pre-launch milestones + launch-day sequence in this doc.
- [ ] Keep self-hosted OTA + APK fallback as ongoing levers; then build the retro-selected post-MLP bets.

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
