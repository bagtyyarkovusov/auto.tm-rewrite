# ADR-0074: Digest-pinned Chainguard MinIO images

- **Status**: Accepted
- **Date**: 2026-10-01
- **Deciders**: Founder, recorded by the founder-delegated Codex integration owner

## Context

Fresh machines cannot anonymously pull the previous `quay.io/minio/minio`
image. CI temporarily substituted a Chainguard image and tagged it under the
old name for Testcontainers. The founder selected Chainguard MinIO in #475.
This decision complements ADR-0008's self-hosted S3 storage and ADR-0039's
Railway-first hosting; it does not change the storage API or bucket contract.

## Decision

Use `cgr.dev/chainguard/minio` pinned by multi-platform OCI index digest
in development, CI, TM production Compose, Testcontainers, and Railway.
The initial pins, resolved anonymously on 2026-10-01, support Linux amd64 and arm64:

| Variant | Digest | Consumers |
|---|---|---|
| Minimal, resolved from `latest` | `sha256:4692462f35d97d7e82c30371d82f057703c5d9489bcae726010594c812f2d285` | Development and production Compose, Testcontainers, Railway |
| Dev, resolved from `latest-dev` | `sha256:8d5a0265f0e18fb3b29f95598147f1cc2a86b782181668bad176b0e90cce9569` | CI Compose only, where `CMD-SHELL` and `wget` probe the live endpoint |

The entrypoint is `/usr/bin/minio`; Compose and Testcontainers pass `server
/data` as its arguments. Development, TM production, and Railway also set
`--console-address :9001`. Testcontainers probes HTTP from outside the
container, so it needs no shell. Remove the CI override and local image alias.

Keep every existing volume identity and its single `/data` mount. The selected
images default to UID 65532; existing volumes are root-owned. Compose explicitly
runs mounted-volume services as `0:0`, and Railway uses its documented
`RAILWAY_RUN_UID=0` setting. Preserve ownership without recursive chown or data
deletion. A future least-privilege migration needs a separate decision and proof.

MinIO remains AGPL-3.0-or-later software. Changing its distributor does not remove
those obligations. Retain upstream source/license notices and inspect the
selected image SBOM for dependency licenses. Chainguard regularly rebuilds its
images, but a digest pin receives no updates automatically. Refresh pins in a
reviewed PR, inspect release notes and SBOM, then prove anonymous pulls, readiness,
bucket bootstrap, S3 import behavior, and retained-volume reads/writes before rollout.

Change Railway staging only after repository verification and review pass,
then verify the deployment and existing objects on the same volume. Production
rollout remains an operator action; the repository contract records its target
image and the reason a live production service may retain the previous image.

## Consequences

### Positive

- Fresh machines pull the same reviewed image without an alias or cached image.
- Existing S3 clients, object paths, and persistent volumes keep their contract.

### Negative / accepted costs

- Mounted-volume services continue running as root to preserve existing permissions.
- Digest refreshes require review and runtime evidence. Public availability and
  continued upstream maintenance depend on the publisher; monitor both at refresh.
- AGPL and dependency license obligations remain. The dev variant adds shell
  tooling and is limited to CI's health check.

## Alternatives considered

- Build MinIO ourselves from source. Rejected by the founder because AutoTM would
  own image packaging and updates.
- Replace MinIO with another S3 server. Rejected because it adds a storage
  migration beyond restoring anonymous pulls.
- Mutable tags or CI-only aliases. Rejected because they hide drift or leave
  development, Testcontainers, and deployment dependent on cached images.

## References

- [Founder decision on #475](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/475#issuecomment-5924909021)
- [ADR-0008](0008-media.md), [ADR-0039](0039-phased-cloud-first-hosting.md)
- [Chainguard MinIO overview and licenses](https://images.chainguard.dev/directory/image/minio/overview)
- [Railway volume permissions](https://docs.railway.com/volumes#permissions)
- [Railway runtime UID](https://docs.railway.com/variables/reference)
- [Compose data contract](../../infra/compose/README.md)
- [Railway MinIO contract](../../railway/minio.md)
