# 84 — Launch plan (cutover from build to live)

## Pre-launch milestones

Before announcing publicly, all of these must be green:

### Engineering

- [ ] All Phase 1 features shipped and smoke-tested
- [ ] All Phase 1 e2e tests passing
- [ ] First 5 OTP phones provisioned + tested in real prod with real SIMs
- [ ] FCM/APNS push delivery verified end-to-end on physical Android + iOS devices
- [ ] Backup + restore tested (do a full restore drill on a staging DB before launch)
- [ ] Observability stack live; alerts firing to Telegram during a drill
- [ ] TLS certs issued + auto-renewal proven via dry run
- [ ] At least 1 successful air-gap deploy from build runner to TM servers

### Content / data

- [ ] Catalog seeded: 100+ brands, 5000+ models, regions + cities + colors + body types complete
- [ ] First 10-20 "seed" listings created by AutoTM staff (so anonymous browsers see content from day 1)
- [ ] At least 2 verified dealerships onboarded
- [ ] Privacy Policy + Terms of Service published in RU + TK + EN

### Compliance

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
- [ ] AutoTM company phone / email for user support set up

## Beta phase (1-2 weeks before public launch)

Goal: shake out bugs with a small known cohort before everyone arrives.

- Cohort: 10-30 invited users (friends, family, sympathetic dealers)
- Distribution: TestFlight (iOS), Internal Testing (Google Play), or direct APK
- Feedback channel: dedicated Telegram group with AutoTM team
- Daily standup-style review of feedback during beta
- Bug fix sprints: anything serious gets a hotfix release before public launch

## Public launch day

### Morning

- [ ] Final smoke test on production
- [ ] Verify backup taken < 4h ago
- [ ] Confirm all 5 OTP phones healthy
- [ ] Telegram channel ready for alerts

### Launch sequence

1. **9:00 TM time** — flip the public web to live (remove "coming soon" banner if any)
2. **9:00** — release announcements queued in admin (don't push yet)
3. **10:00** — verify everything still healthy
4. **10:00** — push announcement broadcast to beta cohort: "We're live!"
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
- **Push notification delays** — first few hundred users registering tokens; expect some lag
- **Image upload failures** — slow Telecom backbone may cause some upload retries
- **Unexpected admin reports** — first scammers will probe within hours; have your moderation queue ready
- **Server load** — should be fine given 5-phone capacity, but monitor CPU + memory closely
- **A bug nobody saw** — guaranteed; have a rollback plan ready

## Rollback plan

If launch day is going badly:

1. **Soft pause** — admin broadcast: "We're addressing an issue; please wait"
2. **Disable signups** — set a feature flag to block new account creation (existing users unaffected)
3. **Disable listings** — flag to set all listings to read-only (chat + browse still work)
4. **Last resort: full rollback** — revert to previous Docker images using `./rollback.sh`

Each of these requires a feature flag pre-built into the app — add to Phase 1 scope.

## Post-launch (week 1)

- Daily metrics review:
  - DAU
  - New listings posted
  - Active listings by city
  - Search and saved-search demand by city
  - Conversations started
  - Favorite/chat/call starts by listing city
  - OTP success rate
  - Push delivery rate
  - Bug reports
- Daily admin moderation review
- City planning action: compare demand by city against active supply by city; use gaps to prioritize catalog cleanup, dealer outreach, and launch expansion. Do not introduce GPS prompts or radius search as a launch-day fix; that decision is locked in [ADR-0022](../../adr/0022-city-first-listing-location.md).
- Weekly retrospective in week 2

## Post-launch (month 1)

- Capture user feedback systematically (in-app feedback form? Phase 1.5)
- Plan Phase 2 with what we've learned
- Re-evaluate the 12-month success metrics from [00-vision.md](../00-vision.md)

## References

- [Phase plan](../02-phases.md)
- [Deployment runbook](80-deployment-runbook.md)
- [Monitoring + alarms](81-monitoring-alarms.md)
- [Incident template](82-incident-template.md)
- [Launch analytics + scaling plan](85-launch-analytics-plan.md)
- [Vision metrics](../00-vision.md)
