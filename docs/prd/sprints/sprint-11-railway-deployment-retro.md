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
