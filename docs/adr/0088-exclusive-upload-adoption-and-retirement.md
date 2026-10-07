# ADR-0088: Exclusive upload adoption and retirement

- **Status**: Proposed
- **Date**: 2026-10-07
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0079](0079-server-recorded-upload-provenance-for-listing-media.md), extending Listing-only adoption to Profile Photos.

## Context

The founder restored Profile Photos to the Android release on October 7 and requires retryable actual storage deletion after replacement, removal and account purge. Identity already publishes `avatarKey` and preserves the Assigned Avatar index. Listing uploads already record the presigning User, image kind, content type, size and object key.

ADR-0079 protects a Listing adoption with `ListingMedia.uploadId @unique`. Adding `User.avatarUploadId @unique` protects each table separately; it does not prevent the same upload from becoming both a Listing photo and a Profile Photo. A read of either relation before a write cannot resolve concurrent requests. Listing removal currently deletes upload provenance before synchronous storage cleanup. The worker's orphan-cleanup processor is a placeholder, so a deletion record without an implemented consumer does not remove public bytes.

## Decision

An upload uses one common `AVAILABLE -> PREPARING -> ADOPTED -> RETIRED -> DELETED` protocol across Listing media and Profile Photos. A failed preparation is terminal: it retires the upload and requires a new presign. Existing records are `LEGACY`; the migration preserves their adopters and never silently upgrades an unconditional upload.

Before exposing a new presigned URL, initialize the fixed manifest exactly once: the selected original and the eight current image variants. Each key starts with a zero-byte placeholder. Await initialization before recording provenance and returning upload authority. Sign the original PUT with `If-Match` against its placeholder ETag, include that header in the signed headers, and return required headers to the client. Native Listing upload and smoke callers forward those headers. Chat's separate upload protocol is unaffected. Initializing an existing recorded upload or recovering a missing key by creating it is forbidden.

Reserve all claimed uploads before classification or Sharp runs. The reservation transaction locks the owning User/target where its invariant requires it, then all upload rows in sorted upload-id order, checks provenance/state and both adopters, and records one attempt token, target and preparation deadline. Listing removal preserves the Listing lock and photo floor before acquiring upload locks. Separate unique relation columns remain additional constraints. Requests generate outside the database transaction; every cleaned-original and derivative PUT uses `If-Match` against the object ETag. Missing keys fail preparation rather than being initialized.

Finalization reacquires the same locks, requires the original `PREPARING` token and target, rechecks User/target eligibility and both adopters, writes the association and `ADOPTED` state atomically. Listing publication includes its Listing, media, draft removal and audit in that transaction. A stranded preparation deadline authorizes only permanent retirement, never takeover or renewed writes. An idempotent committed retry returns the existing association.

Retirement takes those locks, releases the adopter, permanently closes adoption, and records durable deletion of the exact manifest in the same transaction. The storage scanner cancels expired preparations and processes bounded due retirement batches with persistent attempts, next-attempt time and failure reason. A failed or interrupted attempt retains work indefinitely with bounded backoff. Deletion runs outside ownership transactions, through actual `DeleteObject`, followed by HEAD absence verification for every manifest member. Completion is recorded only after all members are absent. The conditional-write fence prevents a delayed client or generator from recreating a deleted key: it cannot satisfy `If-Match`. Signature expiry alone supplies no such guarantee.

Deletion authority requires the existing strict owned pending UUID namespace and no retained Listing keys/posters or Profile Photo keys beneath it, including legacy references without an upload relation. A conflicting live reference remains blocked pending work. New reference writers use the common protocol. Legacy unconditional uploads remain logically retired with physical cleanup explicitly pending unless an independently proven writer-drain condition supplies safe deletion authority; they are never represented as deleted merely because their public association disappeared.

Each storage operation fails closed if conditional writes are unsupported or bucket versioning is enabled, suspended, unknown or denied. Actual-byte deletion assumes the bucket remains unversioned; no live bucket changes are authorized. The supported provider probe must use uniquely owned scratch keys, clean them, and prove conditional-write behavior before enabling new fenced uploads. Hosted integration against the digest-pinned CI MinIO must prove signed missing/altered-header refusal and PUT/delete races; upstream master source or an S3 compatibility label is insufficient evidence. Deployment provider/versioning proof remains a human-operated release gate.

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
- [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html), including missing-object refusal after deletion.
- [AWS SDK presigner](https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md), `signableHeaders` queried through Context7 `/aws/aws-sdk-js-v3`; pinned SDK/header interoperability still requires tests.
- [Prisma transaction documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), queried through Context7 `/prisma/web` for transaction-client scope and rollback.
