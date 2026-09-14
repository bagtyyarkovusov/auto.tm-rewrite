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
