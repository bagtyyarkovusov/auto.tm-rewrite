# Issue 477 verification checkpoint

PR: [480](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/480). This checkpoint is **incomplete**: native screenshots, successful remote seed twice/readback, final independent reviews and PR480 deletion proof remain required.

## Source and gates

- Runtime source: `c9657eb3810fdc5172f1d09998011102d2325496`, integrated main `dc85c17519b6fb3d71230c3953cc061af4b8deca` from #454.
- [Full hosted CI 36832190352](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/36832190352) SUCCESS at that source. Repository unit/typecheck gates and affected db lint/typecheck passed locally; eight native seed guard tests passed. No local Docker gate ran.
- [Previous CI 36831562619](https://github.com/bagtyyarkovusov/auto.tm-rewrite/actions/runs/36831562619) failed at the existing #454 lost-CAS test: expected eight objects, observed four. Its master-load barrier did not force both fresh reads before either activation. A test-only first-upload barrier now makes the race deterministic, preserving winner-pointer and unreferenced-loser assertions. Production importer and ADR0072 were unchanged.
- Meaningful red source commits: `26f3eaa` environment guard, `accea61` cross-environment media, `baffcca` private remote mode, `d3e237c` workspace bootstrap resolution. Node-only remote steps red source is preserved on `codex/issue-477-remote-node-red` at `884daca25f824eafeb97c643ac1c2dde218b9319`; retain that branch.
- Direct entry `RAILWAY_ENVIRONMENT_NAME=production node scripts/native-pr-seed.mjs --remote` exited 1 with `Native seed requires an auto.tm-rewrite-pr-<number> PR environment`. Direct fixture invocation likewise refused production before constructing clients. A final-image SSH refusal is still required.

## Railway state

Project `176ddec0-dd65-4087-b82c-798599fc2ebe`; exact PR480 environment `2f202886-5a5a-49f8-be0c-1eb7b04fecdb`, name `auto.tm-rewrite-pr-480`.

| Service | ID | Evidence |
|---|---|---|
| API | `6db6f1b1-5c7a-4033-88d0-53f5f315bfc0` | Deployment `bf631d92-6a20-407b-a608-dea96553f803` BUILDING at c9657eb at checkpoint preparation |
| Worker | `24aa02e0-25a9-4e80-9cc2-c1795ef82091` | Deployment `72f33a18-8c1a-4c22-bc31-06074b032c46` SUCCESS at `5f0edb4445ca4324da604803eab2f95f636087af` |
| MinIO | `af9ecdec-433b-48f0-8457-1a13c5ab1ab7` | Deployment `65106b77-34a8-4ddf-8d8b-dba8ddc5251c` SUCCESS on ADR0074 pinned digest |
| Postgres | `30dda76c-1a50-457f-a08a-dce846eb9843` | Healthy; deployment `3bfd36bc-5697-4ed3-9983-9fcff4c777cc` SUCCESS |

API public URL: `https://api-autotm-rewrite-pr-480.up.railway.app`; mobile base URL must append `/api/v1`. Public media: `https://minio-autotm-rewrite-pr-480.up.railway.app`.

Worker functional-input carry-forward was checked with exit-zero diff from 5f0edb4 through c9657eb across `apps/worker`, `packages/db/src`, generated Prisma, schema, contracts, root dependencies/workspace configuration and worker Docker/Railway configuration. Its deployment SHA remains 5f0; do not label it c965.

The prior API 5f0 deployment `d4a87727-5b12-40da-b880-069bce3ef5b3` passed readiness with Postgres/Redis/MinIO healthy. Its first actual remote seed failed at bucket bootstrap, before bucket writes: `ERR_MODULE_NOT_FOUND: @aws-sdk/client-s3 imported from /app/infra/minio/contract.mjs`. The final image moves bootstrap beneath the db package's declared dependency resolution and uses direct Node/tsx steps without requiring pnpm remotely. The earlier image COPY failure was fixed by a narrow dockerignore allowlist. These are one packaging repair sequence; do not reset its bounded repair count.

SSH preflight on the previous image confirmed Node22.23.3, tsx, generated Prisma, catalog JSON, logo manifest, fixture photos, sharp/simple-icons/pg/AWS resolution through db, and writable logo cache parent. The registered railway-debug SSH key works; no new key was created.

## Scope and cleanup

Only PR480 config was changed: API/worker media and admin/web API/media origins reference their own services. Seed guards reject inherited staging media. No staging/production data or network configuration was changed.

The optional PR480 public Postgres path had pre-authentication EOF after three focused network attempts. Remote private-network SSH is now the default. Owned unused TCP proxy `d10a3d5f-790b-4ced-9e92-5b5b6c1a14ee` was deleted; readback returned an empty proxy list. Unused public URL references are not used by remote seed.

Environment-scoped project token creation returned `Not Authorized` (trace8349234961966245357), without alternate credential retry. [Founder-delegated disposition](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/477#issuecomment-5926410525) accepts coordinator account authentication for this orchestration. ADR0075 documents that the guard is operational and broad credentials can reach production.

Root independently observed closed real PR479 environment `04697664-cbe6-4400-8a49-d028824b8bc6` absent. PR480 remains open; its automatic deletion must be verified after merge/close.

## Resume

Use `/Users/bagtyyar/.railway/bin/railway` (5.58; the worktree shell otherwise finds 4.57). Prefix calls with `RAILWAY_CALLER=skill:use-railway@1.6.1 RAILWAY_AGENT_SESSION=autotm-orchestration-20261001`. Never print credentials.

After exact API SUCCESS and readiness SHA verification, execute through explicitly scoped SSH:

```sh
railway ssh --project 176ddec0-dd65-4087-b82c-798599fc2ebe \
  --environment 2f202886-5a5a-49f8-be0c-1eb7b04fecdb \
  --service 6db6f1b1-5c7a-4033-88d0-53f5f315bfc0 \
  node /app/scripts/native-pr-seed.mjs --remote
```

First run a production-name override of the same entry and confirm refusal; then seed twice and read back stable fixture identities/counts, 0/1/2-photo listings, buckets/media and imported logos. No successful content seed is claimed at this checkpoint.

Native phase has **not started**; no owned Metro/native process exists. Parent assigned primary iPhone17 UUID `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13`, Metro8477. Parent owns second UUID `3A8BB230-13C9-4624-8239-395A6E887D4C`. Both were booted/installed but simultaneous running-app capacity remains unproved. Renew capacity/foreground ownership before starting. Use CUA for UI gestures and explicit UUIDs for official simctl launch/screenshots. Never use the user's iPhone16e. Capture real PR login/feed/detail/gallery with Docker absent, commit sanitized logs/screenshots, then obtain fixed-final-SHA Standards and Spec reviews.
