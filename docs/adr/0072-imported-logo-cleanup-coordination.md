# ADR-0072: Coordinate imported logo cleanup

- **Status**: Proposed, not approved for implementation
- **Date**: 2026-09-30
- **Deciders**: AutoTM founder, decision pending
- **Scope**: Issue #454's whole imported-version cleanup on admin replacement or removal

## Problem

The importer writes four objects under deterministic `brands/<slug>/imp-<hash>/` prefixes before a compare-and-swap of `Brand.logoKey`. PR #461 deliberately retains previous imported versions and losing uploads. A second CLI process can reactivate the same prefix, so deleting it after an admin change can remove active assets.

Reading the current key immediately before deletion is insufficient. Another process can upload and activate the prefix between the read and deletion. Compare-and-swap prevents an obsolete database write, but does not serialize object deletion against upload or reactivation. In-process locks do not protect separate API or CLI processes.

The repository has no established advisory-lock or row-lock helper. `BrandLogoRepository` currently exposes only reads and `setLogoKey`; `PrismaBrandRepository` uses unconditional writes. The importer performs uploads and repairs outside a database transaction. This proposal therefore changes a coordination boundary and needs founder approval.

## Candidate shared lock

A PostgreSQL advisory transaction lock, namespaced to catalog brand-logo mutation and keyed by immutable `Brand.id`, would be shared by all API and CLI writers. Lock one brand at a time, never multiple brand locks. Hold it from a fresh read through the complete operation:

- Admin set: fresh read, upload stored version, update database, delete previous version.
- Admin remove: fresh read, clear database key, delete previous version.
- Brand delete: fresh read, delete database record, delete previous version.
- Import: fresh read, restore or upload all objects, compare-and-swap, optional previous admin-version cleanup. Continue retaining old and losing imported versions; this is not importer garbage collection.

The API domain would receive a framework-free mutation coordinator port. Its infrastructure adapter and importer would use a common DB-package helper. `SetBrandLogo`, `RemoveBrandLogo`, and `DeleteBrand` would use the coordinator. The importer must join the same protocol before enabling prefix deletion. All cleanup stays within an exact validated version directory and handles pagination, at most 1,000 keys per S3 delete batch, and partial deletion errors.

## Duration and failure problem

A 5-second lock-acquisition budget and 60-second transaction timeout are attractive load bounds, but they do **not** establish safety. Four parallel uploads, retries, restore HEAD requests, or arbitrarily many paginated siblings have no demonstrated worst-case bound below 60 seconds. Holding a transaction and connection during S3 calls increases DB connection pressure.

More seriously, an interactive transaction can time out and release its lock while storage work is still running. Promise cancellation or an AbortSignal does not prove that the remote MinIO server has stopped executing a submitted deletion. A later importer can then reactivate that deterministic prefix before the delayed deletion executes. Therefore the candidate bounded transaction lock must not be implemented as a complete solution.

A session advisory lock avoids automatic transaction-timeout release, but connection loss or an uncertain storage response still leaves the same ambiguous deletion. Releasing in `finally` after a rejected request is not proof of safe completion. Retaining a DB connection indefinitely is not an acceptable recovery mechanism.

## Decision needed

Choose a protocol with durable deletion fencing before automatic cleanup is enabled. A durable retirement record committed together with the admin database mutation could prohibit all importer reuse of a retired deterministic prefix, including on failures and delayed storage replies. That requires a migration and a defined policy for later reimport of the same master. Keeping retirement permanent changes importer idempotence; assigning a fresh incarnation on reuse changes its key contract. Those choices exceed ordinary cleanup mechanics and are not silently selected here.

The alternative is operator cleanup during a verified exclusive maintenance window, with API logo writers and CLI importers stopped for the entire storage operation and recovery period. That does not deliver automatic cleanup from the admin action and must be explicitly accepted as a scope change.

Until that decision, retain imported prefixes rather than risk deleting active assets. The independently authorized scoped policy, pending lifecycle, and PUT length signing can ship, but #454's added whole-prefix criterion remains incomplete.

## Verification before production changes

1. Write meaningful failing tests for admin set/remove/delete removing all four imported objects while preserving other versions.
2. Use two real PostgreSQL clients and isolated MinIO to force upload/activation between admin mutation and delayed cleanup, including cross-process ABA, missing-object repair, and lost CAS.
3. Prove the chosen fence survives DB timeout, connection loss, storage abort, delayed deletion completion, partial batch errors, and process restart.
4. Prove a fresh importer cannot activate a retired prefix and define/test intentional reimport behavior.
5. Push the red checkpoint before implementing the accepted protocol. Then rerun the same cases green, plus existing #377 importer tests, repository gates, runtime-import checks, and affected API/db builds.

No new lock helper, migration, importer cleanup, or automatic prefix deletion is implemented by this proposal.
