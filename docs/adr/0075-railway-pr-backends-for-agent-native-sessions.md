# ADR-0075: Railway PR backends for agent native sessions

- Status: Accepted
- Date: 2026-10-01
- Decision owner: Founder, accepted through the explicitly delegated orchestration session
- Amends: ADR-0039 and the coding-workflow local verification rule

## Context

The shared 16 GB Mac runs native simulator sessions. Local Postgres, Redis, MinIO, API and worker containers compete with Metro and the simulators. Issue #474 moved container-backed repository tests to GitHub-hosted CI. Issue #475 supplies a digest-pinned, anonymously pullable MinIO image for fresh environments.

The founder chose Railway PR environments based on staging. Bot PR environments and Focused PR environments remain off so founder-account agent PRs, including mobile-only PRs, get the complete backend.

## Decision

Agents use ephemeral Railway PR environments for native backend sessions. Each environment runs that PR's API and worker with its own Postgres, Redis and MinIO volumes. It contains demo data only and uses `SMS_DRIVER=mock`. Production remains outside this workflow. This decision approves external egress to Railway for agent backend operations and the fixture downloads already documented by the UI fixture and licensed logo importer.

Prefer an environment-scoped Railway project token shared by all agents working on that PR. A reusable workspace API token includes production permissions. Here the public `projectTokenCreate` operation returned `Not Authorized`; the founder authorized the existing coordinator CLI account session to perform preview setup, seed, logs and redeploys against explicitly verified PR IDs/names. Individual native agents need only the public API URL and their local Metro process. No new human token action is required for this orchestration.

Store reusable credentials outside the repository with owner-only permissions. The coordinator checks actual project/environment identity before mutation, and the seed rejects every name except `auto.tm-rewrite-pr-<positive-number>`, requires the AutoTM project identity and mock SMS, and rejects cross-environment media hosts. These are operational guards. Broad credentials can still reach production through other commands, so future agents must not claim that they are cryptographically isolated. Scoped PR tokens remain preferred when provisioning supports them.

Hosted required CI is the authoritative evidence for container-backed repository tests, including Testcontainers end-to-end and race tests. Agents run non-container unit/focused tests, repository typecheck, affected lint and applicable export/build checks locally. Native evidence identifies the deployed backend commit and simulator screenshot. Agents do not start local Docker to duplicate hosted container gates.

Locally run Metro and explicit owned simulators. Up to two isolated simulator sessions may run when the coordinator verifies available capacity and assigns separate UUIDs and Metro ports. Run only one heavy installation, build or test phase at a time on this host. Serialize foreground UI control and never stop an unknown workload. The founder's pressure-warning override applies only to this orchestration, not to future sessions.

Railway automatically deletes its PR environment when the PR merges or closes. Verify deletion by environment ID. A session that ends before its implementation PR closes must use a disposable proof PR for lifecycle evidence or explicitly report cleanup pending. Do not delete another PR's backend.

## Consequences

Every open PR runs billed backend services. This buys predictable native sessions and reduces local memory pressure, but keeping many draft PRs open costs money. Close disposable proof PRs promptly, verify their cleanup, and preserve active issue PRs until review and merge.

Run the seed through Railway SSH inside the PR API image. This private-first path needs no public database access. The image packages the guarded entry point, bucket bootstrap, db seed scripts, generated client, fixture manifest and their dependencies. Remote mode validates the private Postgres and MinIO origins in addition to PR identity and its public media host. It seeds catalog references, all four public-read buckets, demo users, listings with zero, one and multiple photos, and licensed brand logos. Rerunning converges fixture data; it replaces only the fixture's fixed rows and deterministic media keys.

`railway run` executes locally and cannot resolve private Railway hostnames. Its optional local seed mode requires explicit public Postgres and HTTPS MinIO connections. The PR480 proof TCP proxy closed its PostgreSQL handshake before authentication despite an active readback and scoped redeploy. Three focused network paths did not repair it. Remote seeding avoids that route. A public authenticated Postgres proxy adds an attack surface for demo data; remove the owned unused proof proxy and verify deletion.

Migrations remain the API pre-deploy step under ADR-0039. This workflow does not run `db push`, production migrations, production fixture writes or production promotion. Existing PR environments can retain old source configuration after a staging change; inspect MinIO image and successful deployment rather than assuming inheritance updated them.

## Sources

- [Railway PR environments](https://docs.railway.com/environments)
- [Railway API authentication and environment-scoped project tokens](https://docs.railway.com/integrations/api)
- [Railway variables and local run](https://docs.railway.com/variables)
- [Issue #477](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/477)

- [Founder-delegated access disposition for this orchestration](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/477#issuecomment-5926410525)
