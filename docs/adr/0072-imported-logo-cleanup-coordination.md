# ADR-0072: Give logo activations unique object directories

- **Status**: Proposed, not approved for implementation
- **Date**: 2026-09-30
- **Deciders**: AutoTM founder, decision pending
- **Scope**: Issue #454's whole imported-version cleanup on admin replacement or removal

## Context

PR #461 retains old imported versions and losing uploads because deterministic `brands/<slug>/imp-<hash>/` directories can become active again in another CLI process. An admin's delayed deletion can therefore delete active assets. Checking the current key before deletion has a time-of-check race. Compare-and-swap protects a database write, but does not serialize deletion against reactivation. The repository has no established cross-process storage lock.

A 60-second transaction lock across S3 calls is insufficient. Parallel uploads, retries, repair HEADs, and paginated deletion have no proven worst-case duration below 60 seconds. Transaction timeout can release the lock while storage is still running. An AbortSignal or rejected request does not prove the remote server stopped deletion. A session lock has the same uncertain-response and connection-loss problem. Do not implement either as the safety mechanism.

## Decision proposed for founder approval

Every new logo activation gets a directory that has never been active before. No inactive directory is reactivated. Cleanup can then remove the actual previous directory after the database swap without threatening a later active logo, including when deletion completes late.

### Imported keys

Keep `importVersion(entry)` as the content/render identity `imp-<hash12>`. New activations use `brands/<slug>/imp-<hash12>-<randomUUID>/logo.png` and its three `mono@Nx.png` siblings. UUIDs come from Node's cryptographic randomUUID. Losing CAS uploads retain their directory and are never reused by another activation. This preserves #377's no-GC rule for importer failure artifacts.

If the currently active imported key matches the entry's content/render identity, the importer remains idempotent and repairs missing objects in that exact current directory. The repair branch never writes Brand.logoKey. Both legacy `imp-<hash12>` and new `imp-<hash12>-<UUID>` keys are recognized as imported ownership. A legacy directory remains usable only while it is the active key; a later activation of the same content uses a new UUID directory. Source-null entries continue preserving any existing key.

A stale snapshot may repair a directory that has since become inactive. That can recreate orphan files, but cannot make them active. Never turn a repair into reactivation or derive its target directory from a newly computed activation key.

### Admin keys

New admin activations use `brands/<slug>/v<epoch-ms>-<randomUUID>/logo.<png|webp>`. Time remains descriptive, not an identity or ordering guarantee. Existing `v<epoch-ms>` keys remain supported. Two same-millisecond uploads must use distinct directories. Pending keys are already random UUIDs.

### Atomic database-only mutations

Admin set/remove must obtain the actual previous key from their mutation, rather than an earlier read. A repository operation uses a short PostgreSQL transaction: lock the Brand row by immutable ID with SELECT FOR UPDATE, read its current key, write the new key or null, return the actual previous key, then commit. Set uploads the new unique object before this transaction. Remove does no storage work before it. After commit, delete the returned previous directory. No storage call is inside the transaction.

Brand deletion likewise locks/reads/deletes in a short transaction and returns the logo key of the row actually deleted. A foreign-key failure returns no cleanup work. This prevents an earlier stale Brand read from leaving the concurrently replaced directory unaccounted for. Deleted brand IDs are not reused; a recreated slug has a fresh Brand ID and fresh activation UUIDs.

Affected boundaries: BrandLogoRepository needs an atomic replacement operation returning the previous key; BrandRepository deletion needs the deleted logo key result; PrismaBrandRepository implements both. SetBrandLogo, RemoveBrandLogo, and DeleteBrand consume those results. MinioBrandLogoStorage gains best-effort version-directory cleanup. The DB importer updates imported-key parsing, activation-directory generation, and repair-directory selection. No new shared runtime coordinator, retirement table, or migration is needed for this recommendation.

Importer activation retains the existing `updateMany` CAS against the observed logoKey. It writes all objects to its new unique directory before CAS and keeps lost-CAS objects. Forced replacement cleanup targets only the previous admin directory after successful CAS. The importer still does not garbage-collect imported versions.

The protocol does not assume updatedAt is monotonic. Logo-key CAS can accept timestamp/null ABA, as it already can today. Unique directories establish active-object safety even in that case; they do not add a stronger guarantee that an import always loses to an intervening admin removal that returns the key to null. A stronger mutation-revision guarantee would need a separate explicit design and migration.

### Cleanup and failure bounds

Only an exact validated `brands/<slug>/<supported-version>/` directory is deleted. Enumerate all pages, delete batches of at most 1,000 keys, and report partial S3 errors. Legacy/admin single-object keys outside recognized directories use single-object deletion. Cleanup is best effort, logs failures, and never rolls back a committed brand mutation.

Use short DB transaction acquisition and execution limits, for example maxWait 5 seconds and timeout 5 seconds, without storage work. A DB timeout before commit must not trigger old-prefix cleanup. Retain and log uploaded candidates on every ambiguous repository/DB failure. Existing SetBrandLogo deletes the candidate on any repository exception; that catch must change because an unknown commit may already have activated the candidate. Delete a candidate only when the repository positively reports that it was not activated, never merely because an exception occurred. Storage request timeouts may leave orphan files; delayed deletion remains safe because the prefix can never become active again. No total cleanup-time claim is made for unbounded pagination.

### Rollout barrier

Stop all old API logo writers and deterministic importer processes before enabling whole-prefix deletion. A mixed rollout is unsafe: an old importer could reactivate a deterministic legacy directory while a new API deletes it. After all writers use the new protocol, legacy active keys may remain until replaced or removed. Do not present code deployment alone as proof that old CLI writers stopped; the environment operator owns this barrier. Local integration tests use only isolated services. No live rollout is authorized by this proposal.

## Explicit limitation requiring founder acceptance

Concurrent missing-object repair can recreate inactive siblings after admin cleanup. Crashes, lost CAS, and uncertain storage requests can also leave inactive files. Therefore this delivers whole-prefix best-effort cleanup and active-object safety, not a permanent guarantee of zero orphan files. The founder must explicitly accept that limitation for #454.

A stronger zero-recreation guarantee requires durable retirement fencing that every writer observes before writing, with a defined same-master reimport policy and recovery after delayed storage requests. That requires more state and likely a migration. Keeping retired deterministic prefixes permanently forbidden or generating fresh incarnations for reuse is a product/key-policy decision, not a silent cleanup adjustment.

## Verification before production changes

1. Push red tests for all four imported files removed by set/remove/delete, pagination and partial errors, with other versions untouched.
2. Push red tests for unique new import activations of the same content and same-millisecond admin uploads. Prove current legacy/new imports remain idempotent and repair uses the active directory without updating the database.
3. Use isolated MinIO and two real PostgreSQL clients to delay prior-prefix deletion while a new import activates identical content. The active directory and all siblings must survive. Repeat with overlapping set/remove/full brand deletion and null ABA; assert safety without treating updatedAt as a revision.
4. Force late repair of a removed directory. Verify it cannot reactivate that directory and document any recreated inactive files as the accepted limitation.
5. Exercise failed CAS, DB rollback/timeout, uncertain storage response, and restart. Retain #377's importer failure/no-GC behavior.
6. After founder acceptance, implement and rerun the same cases green, then repository test/typecheck, affected lint/build/runtime gates and documentation checks.

No key-policy or automatic prefix-cleanup production code is implemented by this proposal.


## Consequences

### Positive

- Delayed previous-prefix deletion cannot delete active objects after all writers use the protocol.
- Admin cleanup includes all imported siblings without holding a DB transaction during storage calls.
- Current imports keep idempotence and missing-object repair, including legacy active keys.

### Negative / proposed accepted costs

- Late repair and failed storage operations can leave inactive orphan files.
- Key parsing and API tests must support new unique version segments.
- Enabling cleanup requires an operator barrier that stops old writers.

### Neutral

- No database migration is required for active-object safety. A stronger mutation-revision guarantee remains a separate decision.
- Pending lifecycle and upload-length signing are independent of this proposal.

## Alternatives considered

- Deterministic directory reuse plus a current-key check: rejected because reactivation can occur after the check.
- Bounded DB or session lock across storage: rejected because timeout or connection loss can release the lock before a remote deletion settles.
- Durable retirement fencing: stronger orphan-prevention protocol, deferred pending a need for that guarantee and defined reimport/recovery behavior.
- Exclusive maintenance-window cleanup: avoids concurrent writers but does not provide automatic admin cleanup.

## References

- [Issue #454 and founder scope comment](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/454#issuecomment-5910480337)
- [PR #461's immutable imported-version safety fix](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/461)
- [Catalog ownership and logo constraints](../../apps/api/src/modules/catalog/CONTEXT.md)
- [Current importer](../../packages/db/scripts/brand-logos/import.ts)
- [Current admin replacement](../../apps/api/src/modules/catalog/application/SetBrandLogo.ts)
