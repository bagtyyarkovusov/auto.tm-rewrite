# Sprint 11 — Railway deployment + store-review readiness — Retrospective

> Opened 2026-09-14, mid-sprint, to record a post-🟡 scope change. S11 has **not**
> closed. The execution shape, shipped-vs-planned table, and verification evidence
> are written at sprint close by `/close-sprint 11`; this file carries only the
> scope changes that ADR-0020 requires be recorded outside the locked sprint file.
> Append-only: never edit an entry below, add a dated one.

## Mid-sprint scope changes

### 2026-09-14 — S11-11 closes with acceptance criterion 7 unmet

[#281](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/281) (S11-11) is
completed and closed with one of its seven acceptance criteria **not met**.
Criterion 7 read "No application revision is promoted and no store build/submission
occurs in this issue." The store half was met. The promotion half was breached
before the issue's work began in earnest: duplicating staging to create production
copied staging's deployment triggers, which fired on their own on 2026-09-05 and
left four application deployments running for roughly eleven minutes. No promotion
command was ever issued.

The founder accepted the breach on 2026-09-14 rather than blocking S11-12 on an
unremediable historical fact. The criterion is **not** reworded and is not recorded
as satisfied — the sprint file's DoD stands as written, and the disposition governs
only what the unmet state means for sprint progression. The full reasoning, the
self-reported (and very likely no longer independently verifiable) basis of the
incident, and the forward-only compensating gate are in
[#281 evidence](../ops/evidence/issue-281-production-foundation.md) under the
criterion-7 disposition.

Why this is a scope change and not a clarification: the sprint file's completion
bar for S11-11 assumed all seven criteria would pass. Closing the slice with one
permanently unmet changes what "S11-11 done" means, which ADR-0020 routes to this
file rather than to an edit of the locked sprint file.

**Consequences carried forward:**

- S11-12 ([#282](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/282))
  unblocks, and inherits a new hard pre-promotion gate: read production deployment
  history and trigger configuration immediately before the first promotion and
  record the result. Recorded in [the deployment runbook](../ops/80-deployment-runbook.md)
  as step 4.1 of the manual production deploy.
- Also deferred to S11-12 by the 2026-09-13 dispositions: migrations plus the
  reviewer scenario seed, the production Firebase project, Android and Apple push
  proof, runtime readiness, and the stable-domain gate. Criterion 6 on #281 is
  therefore partial by design rather than by slippage.
- Criterion 2 is met on data locality only, and criterion 5 on infrastructure only.
  Both need re-confirmation under S11-12 once a revision is permitted to run.

### 2026-09-15 — S11-12 held until production push credentials exist

[#282](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/282) (S11-12) is
**held before any work begins**. Its six acceptance criteria are unchanged and
none is reinterpreted; this entry records that the slice does not start, and what
lifts the hold.

The blocking fact is narrower and harder than "push cannot be proved". The
production worker has `PUSH_TRANSPORT=fcm-apns` set with all eight credential
variables absent, and `validatePushContract` in `apps/worker/src/env.schema.ts`
rejects that combination **at boot**. The worker is third in the promotion order,
so the missing credentials do not merely fail criterion 3's both-platform push
clause — they stop the worker from starting at all, which also puts criteria 1
and 2 partly out of reach for the full service set.

The founder was offered a promotion-now option against a hold, and chose the
hold. The two routes by which a partial proof could have been reached were
recorded at the time and are not taken:

| Route | Why it is not taken |
|---|---|
| Promote with `PUSH_TRANSPORT=ntfy` | Boots without credentials and fails every send permanently and visibly through `UnconfiguredPushTransport`, so it is honest rather than silent. But it is a deliberate production posture change made solely to get a green run, and it would produce a promotion proof of a configuration that will never be the shipped one. |
| Promote API/admin/web and skip the worker | Breaks the runbook's promotion order and leaves criterion 1's "deployed services expose the same recorded SHA" unsatisfiable for the full set. |

The founder chose to hold rather than to record a fifth partial criterion. The
precedent weighed was S11-11's criterion 7 immediately above: a slice closed with
a criterion permanently unmet cost a founder disposition and its own PR, and #282
would have entered that state by choice rather than by accident.

**What lifts the hold** — both, not either:

1. Apple Developer Program membership, then `tm.auto.app` registered and iOS
   signing provisioned in EAS credentials (tracked on
   [#279](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/279)), which
   yields `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` and `APNS_PRIVATE_KEY`.
2. The production Firebase project, which yields `FCM_PROJECT_ID`,
   `FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY`.

`APNS_PRODUCTION` is an operator-set flag and needs no provider.

**Consequences:**

- #282 regains the `blocked` label; `ready-for-human` stays. It leaves the ready
  queue until both credential sets exist.
- [#283](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/283) (S11-13)
  stays blocked behind S11-12, so **S11 cannot close on this hold**. That is the
  reason this sequencing decision is recorded here rather than left implicit: it
  changes S11's completion path without changing any slice's criteria.
- The S11 roadmap row stays 🟡 and Current stays 11. A hold is not a status change.
- The pre-promotion readback taken on 2026-09-15 is **not** a step-4.1 record.
  Step 4.1 binds a read taken immediately before promoting; this one was taken to
  test the handoff's assumptions. #282 must still run its own when it resumes.

### 2026-09-16 — Apple deferred to October 12; Google Play becomes the sole near-term target

The founder will begin Apple Developer Program enrolment and account creation on
**2026-10-12**. Until then the product focus is the **Google Play launch only**.

This puts a roughly four-week floor under the #282 hold recorded on 2026-09-15,
and S11 cannot close before it: #283 (S11-13) depends on S11-12.

**Progress since the hold.** The production Firebase project exists, and the FCM
half of the worker's push contract is not merely populated but proven live — the
stored credential mints a `firebase.messaging`-scoped token and
`fcm.googleapis.com` is enabled. `APNS_BUNDLE_ID` (`tm.auto.app`) and
`APNS_PRODUCTION` (`true`) were set on 2026-09-16 because neither needs Apple.
Six of eight push variables are present; `APNS_KEY_ID`, `APNS_TEAM_ID` and
`APNS_PRIVATE_KEY` remain, all downstream of the October enrolment.

**The blocker this exposes.** An Android-only launch is not reachable by waiting.
`validatePushContract` in `apps/worker/src/env.schema.ts` treats `fcm-apns` as
all-or-nothing: every one of the eight variables is required, so the worker fails
at boot with three APNS values missing even though FCM works. Verified by parsing
the production variable set through the real `EnvSchema`:

```
boots with Android-only credentials: false
  APNS_KEY_ID      : required when PUSH_TRANSPORT=fcm-apns
  APNS_TEAM_ID     : required when PUSH_TRANSPORT=fcm-apns
  APNS_PRIVATE_KEY : required when PUSH_TRANSPORT=fcm-apns
```

So the Google-Play-only period cannot produce a booting production worker under
the current contract. The two existing escape hatches are both wrong here:
`PUSH_TRANSPORT=test` is rejected outright in production, and `ntfy` boots but
fails every send through `UnconfiguredPushTransport`.

**Consequence: this needs a decision, not a wait.** Shipping Google Play before
Apple requires an FCM-only path — most plausibly a fourth transport value
requiring only the three `FCM_*` variables, leaving `fcm-apns` untouched for the
both-platform era. That changes the transport contract fixed by ADR-0009 and
ADR-0043, so it needs its own ADR rather than an edit to either. Not yet opened as
an issue; flagged here so the October date is not mistaken for the only obstacle.

**#282's criterion 3 is unaffected** and still reads both-platform. An FCM-only
transport would let the worker boot and let Android push be proven; it would not
satisfy criterion 3, which remains gated on Apple regardless.

### 2026-09-16 — the FCM-only transport is decided and built ([ADR-0047](../../adr/0047-fcm-only-push-transport-for-android-first-launch.md))

The decision flagged in the entry above is taken. The founder directed that the
project focus exclusively on the 2026-10-12 Apple date — Google Play until then —
and that the code and environment be aligned to it rather than left waiting.

[ADR-0047](../../adr/0047-fcm-only-push-transport-for-android-first-launch.md)
adds a fourth transport value, `fcm`, requiring only `FCM_PROJECT_ID`,
`FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY`. `fcm-apns` is untouched. `fcm` reuses
`FcmApnsPushTransport` — same routing rule, same wire payload, same `deepLink`
contract — with `UnprovisionedApnsSender` on the APNS side, which loads no SDK
and returns `PERMANENT` for an iOS token. It deliberately does not return
`INVALID_TOKEN`: a missing server credential is no evidence a device is dead,
and those `FcmDevice` rows must survive into the `fcm-apns` era.

Verified by parsing the **real** production variable set through the real
`EnvSchema`, values never leaving memory:

```
PUSH_TRANSPORT=fcm-apns (today)   : boots = false
  APNS_KEY_ID      : required when PUSH_TRANSPORT=fcm-apns (incomplete push credentials)
  APNS_TEAM_ID     : required when PUSH_TRANSPORT=fcm-apns (incomplete push credentials)
  APNS_PRIVATE_KEY : required when PUSH_TRANSPORT=fcm-apns (incomplete push credentials)

PUSH_TRANSPORT=fcm      (ADR-0047): boots = true
```

**What this does and does not change for #282:**

- The worker can now boot in production, so the promotion order is runnable and
  the boot-level blocker recorded on 2026-09-15 is lifted. The hold itself is a
  founder decision and is **not** lifted by this entry.
- Criterion 3 still reads both-platform push and is still gated on Apple. `fcm`
  makes Android push provable; it cannot make criterion 3 pass.
- Criteria 1 and 2 return to reach for the full service set, since the worker is
  no longer excluded from a promotion by a boot failure.
- #282's step-4.1 pre-promotion readback must confirm `PUSH_TRANSPORT=fcm` on a
  SHA at or after this change. An older SHA does not know the `fcm` enum value
  and fails closed at boot — visibly, not silently.

**The locked sprint file is not edited.** Its DoD reads "Production has
`SMS_DRIVER=mock`, public signup disabled, reviewer bypass enabled, CI OTP
response mode disabled, and real `PUSH_TRANSPORT=fcm-apns`." That line now
diverges from the shipped configuration, and per ADR-0020 the divergence is
recorded here rather than rewritten there. Read it as **"a real delivering
transport, correct for the launch window"**: `fcm` until Apple credentials
exist, `fcm-apns` after. The clause's intent — that production must never sit on
a transport that delivers nothing — is satisfied by `fcm`, and is still enforced
at boot for `test`. The DoD line is **not** marked met by this entry.

**The reversal is a checklist item, not an inference.** `fcm` in production
after iOS ships would stop delivering to iOS devices with no schema error,
because its own credential rule is satisfied. Switching back to `fcm-apns` is
therefore an explicit step on the October iOS launch path, recorded in ADR-0047
and in [#282](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/282).
