# ADR-0088: Exclusive upload adoption and retirement

- **Status**: Proposed
- **Date**: 2026-10-07
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0079](0079-server-recorded-upload-provenance-for-listing-media.md), extending Listing-only adoption to Profile Photos.

## Context

The founder restored Profile Photos to the Android release on October 7 and requires retryable actual storage deletion after replacement, removal and account purge. Identity already publishes `avatarKey` and preserves the Assigned Avatar index. Listing uploads already record the presigning User, image kind, content type, size and object key.

ADR-0079 protects a Listing adoption with `ListingMedia.uploadId @unique`. Adding `User.avatarUploadId @unique` protects each table separately; it does not prevent the same upload from becoming both a Listing photo and a Profile Photo. A read of either relation before a write cannot resolve concurrent requests. Listing removal currently deletes upload provenance before synchronous storage cleanup. The worker's orphan-cleanup processor is a placeholder, so a deletion record without an implemented consumer does not remove public bytes.

## Decision

An upload has one common transactional adoption and retirement protocol across Listing media and Profile Photos. Every Listing attach, Listing publish and profile set acquires the same upload-row lock and checks both adopters inside the transaction that writes its adoption. Multi-upload transactions acquire locks in deterministic upload-id order. Separate unique relation columns remain additional constraints, not the exclusivity mechanism.

Retirement takes that same lock, releases the adopter, marks the upload permanently unavailable for adoption, and records durable storage deletion work in one database transaction. It records the original and all generated objects before losing their identity. Storage deletion runs outside the ownership transaction, in bounded retryable worker batches. A failed or interrupted deletion retains pending work; an idempotent retry deletes any remaining objects. Completion means actual storage deletion succeeded, not merely that the public key was cleared. The worker schedules continuing retries without relying on a new user request.

Cleanup does not report completion while an issued presigned PUT or an in-flight variant writer can recreate objects. The implementation must coordinate preparation with retirement and defer final deletion past presign validity; deterministic tests pause a losing generation while the winner retires. S3 delete markers are not proof of physical deletion: a versioned bucket requires explicit version deletion or a fail-closed refusal, with no live bucket configuration change authorized.

A cleanup job can delete only an exclusively owned Listing-upload directory matching the existing strict presign namespace. It checks retained Listing keys/posters and Profile Photo keys before claiming deletion authority, including legacy references without an upload relation. A retired upload cannot be adopted while deletion is pending. A conflicting retained reference prevents deletion and remains visible as unfinished cleanup work. This extends safe cleanup to profile retirement; it does not introduce unrestricted deletion of unadopted uploads or chat storage.

Identity application and domain code use an injected Profile Photo port. Upload authorization, stored-object inspection, content classification, metadata stripping and variant generation remain behind the upload infrastructure boundary. Profile adoption uses the existing image kind, JPEG/WebP types and 5 MB cap. The upload relation stays private; public identity continues to expose `avatarKey` and the unchanged Assigned Avatar index.

## Consequences

### Positive

- Listing and profile adoption cannot both succeed for one upload, even when they race.
- Replacement, removal, moderator removal and account purge can preserve retryable cleanup without deleting another claimant's storage.
- Existing public identity and image upload contracts remain reusable.

### Negative / accepted costs

- All adoption and retirement writers must participate in the common transaction protocol; an omitted writer breaks the guarantee.
- Ownership migration and worker deletion require independent database/storage integration evidence before profile routes ship.
- Storage outages delay removal of public bytes. Privacy text must describe pending cleanup and its retry behavior truthfully; no instantaneous deletion claim is made.

### Neutral

- The Assigned Avatar remains available after removing a Profile Photo.
- Existing user reports and moderator photo removal supply the approved release moderation path; no automated moderation provider is introduced.
- General orphan sweeping remains outside this decision.

## Alternatives considered

- **Two unique relation columns and a preflight read.** Rejected because they permit one adoption in each table during a race.
- **Clear only the public key or enqueue unswept work.** Rejected because the founder requires actual retryable storage cleanup.
- **Synchronous storage deletion inside the ownership transaction.** Rejected because network failures prolong locks and cannot atomically roll back deleted bytes.
- **General orphan deletion.** Rejected because it expands the release beyond explicit owned retirement and risks unrelated storage namespaces.

## References

- [Issue #642](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/642), profile API and October 7 founder scope decision.
- [Issue #643](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/643), mobile profile upload flow.
- [ADR-0079](0079-server-recorded-upload-provenance-for-listing-media.md), existing upload provenance.
- [ADR-0032](0032-account-deletion-grace-period.md), account purge lifecycle.
- [ADR-0082](0082-an-issue-may-carry-up-to-three-ordered-slices.md), ownership/worker issue boundaries.
- [Prisma transaction documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), queried through Context7 `/prisma/web` for transaction-client scope and rollback.
