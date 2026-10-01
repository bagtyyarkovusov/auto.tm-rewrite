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

Use an environment-scoped Railway project token for agent operations. Store it outside the repository with owner-only permissions. Bind each token to the actual PR environment ID, confirm its scope, and refuse production. The native seed also rejects every environment name except `auto.tm-rewrite-pr-<positive-number>`, validates the AutoTM project identity and requires mock SMS. Account-wide credentials are only for the founder or the delegated coordinator's token provisioning and lifecycle inspection, never the normal native seed.

Hosted required CI is the authoritative evidence for container-backed repository tests, including Testcontainers end-to-end and race tests. Agents run non-container unit/focused tests, repository typecheck, affected lint and applicable export/build checks locally. Native evidence identifies the deployed backend commit and simulator screenshot. Agents do not start local Docker to duplicate hosted container gates.

Locally run Metro and explicit owned simulators. Up to two isolated simulator sessions may run when the coordinator verifies available capacity and assigns separate UUIDs and Metro ports. Run only one heavy installation, build or test phase at a time on this host. Serialize foreground UI control and never stop an unknown workload. The founder's pressure-warning override applies only to this orchestration, not to future sessions.

Railway automatically deletes its PR environment when the PR merges or closes. Verify deletion by environment ID. A session that ends before its implementation PR closes must use a disposable proof PR for lifecycle evidence or explicitly report cleanup pending. Do not delete another PR's backend.

## Consequences

Every open PR runs billed backend services. This buys predictable native sessions and reduces local memory pressure, but keeping many draft PRs open costs money. Close disposable proof PRs promptly, verify their cleanup, and preserve active issue PRs until review and merge.

`railway run` executes locally and cannot resolve private Railway hostnames. The seed uses the PR's public Postgres connection and public HTTPS MinIO endpoint while deployed services retain private networking. It seeds catalog references, all four public-read buckets, demo users, listings with zero, one and multiple photos, and licensed brand logos. Rerunning converges fixture data; it replaces only the fixture's fixed rows and deterministic media keys.

Migrations remain the API pre-deploy step under ADR-0039. This workflow does not run `db push`, production migrations, production fixture writes or production promotion. Existing PR environments can retain old source configuration after a staging change; inspect MinIO image and successful deployment rather than assuming inheritance updated them.

## Sources

- [Railway PR environments](https://docs.railway.com/environments)
- [Railway API authentication and environment-scoped project tokens](https://docs.railway.com/integrations/api)
- [Railway variables and local run](https://docs.railway.com/variables)
- [Issue #477](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/477)
