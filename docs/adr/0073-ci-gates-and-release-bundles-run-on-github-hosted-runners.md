# ADR-0073: CI gates and release bundles run on GitHub-hosted runners

- **Status**: Accepted
- **Date**: 2026-10-01
- **Deciders**: AutoTM founder, in the orchestration chat
- **Amends**: [ADR-0039](0039-phased-cloud-first-hosting.md)'s "CI/CD split" (CI gates run on the `tm-build-mac` launchd runner) and the runner rows of [ADR-0005](0005-hosting.md) (TM Proxy PC as primary and the developer's machine as backup self-hosted runner) for the Railway era

## Context

ADR-0039 kept CI gates on the self-hosted `tm-build-mac` runner, the developer's Mac. That Mac also runs local agent work, and the arrangement has three costs:

- Each pull request push starts a CI job that needs 2-4 GB of memory on a shared 16 GB machine. The job stops local guarded jobs.
- One runner serves every job, so every pull request queues behind the one in front of it.
- The runner depends on a Docker image cache that cannot be rebuilt. `quay.io/minio/minio` can no longer be pulled anonymously (issue #475), so the Mac works only from its cached copy.

The repository is public, so standard GitHub-hosted runners are free.

Draft PR #473 trialled the pull request check on `ubuntu-latest`. With a cold cache the hosted run took 3m33s (run 36813787186). The self-hosted run of the same check took 2m42s (run 36813206674). The hosted run is about 50 seconds slower with no cache, and it needed two workarounds: `actions/setup-node` with `cache: pnpm` instead of the macOS store path, and a pullable MinIO image in CI (`cgr.dev/chainguard/minio:latest-dev`), because a fresh runner has no cached copy.

`bundle.yml` has never run, because no `v*` tag exists. ADR-0005 assigned the air-gap image build to a TM Proxy PC that does not exist yet. The bundle builds server images for TM Linux servers, and an ARM Mac is a worse place to build them than an x86 Ubuntu runner.

## Decision

**`pr-checks.yml`, `ci.yml` and `bundle.yml` run on GitHub-hosted `ubuntu-latest` runners.**

- The required status check keeps the job id `pr`, so branch protection is unchanged.
- Workflows install pnpm with `pnpm/action-setup`, then Node with `actions/setup-node` and `cache: pnpm`. The macOS store path, its environment steps and the store-state diagnostic are removed.
- CI starts its disposable services with the Docker and Compose that the runner provides. CI alone swaps the MinIO image through `CI_COMPOSE_OVERRIDE` and a local image alias. Issue #475 owns the durable image choice for development, production, Testcontainers and Railway, and removes that CI-only workaround.
- `bundle.yml` builds and saves the images on the hosted x86 runner and uploads them as a workflow artifact. It also accepts a manual run, which publishes nothing except that artifact.
- The founder deregisters the `tm-build-mac` runner by hand after this merges. Nothing in the repository registers or depends on it afterwards.

This decision covers the Railway era and the current CI and bundle workflows. ADR-0039's Railway shape, "wait for CI" gating and cutover conditions, and ADR-0005's TM production topology, are unchanged. **The TM-era runner question reopens at cutover.** If building or shipping the bundle under TM egress constraints requires a runner inside Turkmenistan or on a TM Proxy PC, a new ADR decides that then.

## Consequences

### Positive

- CI no longer competes with local agent work for memory on the developer's Mac.
- Pull requests run in parallel instead of queueing behind one runner.
- Every run starts from a clean machine, so CI no longer depends on a hand-maintained Docker image cache or pnpm store. The self-hosted pnpm-store and prune guidance and the runner recreation procedure leave the workflow README.
- The release bundle builds on x86 Linux, the architecture it is loaded on.
- No runner cost for a public repository.

### Negative / accepted costs

- A cold-cache run is about 50 seconds slower than the self-hosted run (3m33s against 2m42s). The GitHub cache of the pnpm store, keyed on `pnpm-lock.yaml`, narrows this for later runs.
- CI depends on GitHub-hosted runner availability and public image registries. A third-party MinIO image is pulled in CI until #475 resolves it.
- The repository must stay public, or the runner minutes become a cost to review.
- The bundle workflow stays untested against a real tag until the first release or a manual dispatch.

### Neutral

- Job ids, lanes, concurrency groups, required-check rules and cleanup steps are unchanged.
- ADR-0005 and ADR-0039 are not edited. The ADR index records the amendment, following the convention of earlier amendments.

## Alternatives considered

- **Keep `tm-build-mac` and live with the contention.** Rejected: it stops local jobs on a 16 GB machine and queues every pull request behind one runner.
- **A second self-hosted runner or a dedicated build machine.** Rejected: it adds hardware to maintain for a job that free hosted runners already do in under four minutes.
- **Keep the gates on the Mac and move only `bundle.yml`.** Rejected: it keeps the contention and splits the CI policy in two for a workflow that has never run.
- **Pay for larger hosted runners.** Rejected: standard runners finish the trial in 3m33s, so paying is unwarranted.

## References

- [ADR-0005](0005-hosting.md) - TM air-gapped topology and self-hosted runner rows
- [ADR-0039](0039-phased-cloud-first-hosting.md) - phased cloud-first hosting and CI/CD split
- Issue #474 - this change; issue #475 - durable MinIO image
- Draft PR #473, runs 36813787186 (hosted) and 36813206674 (self-hosted)
- [`.github/workflows/README.md`](../../.github/workflows/README.md)
- [GitHub Actions self-hosted performance research](../research/github-actions-self-hosted-performance.md)
