# ADR-0089: A transient publish failure releases the draft's photos

- **Status**: Accepted
- **Date**: 2026-10-08
- **Deciders**: AutoTM founder
- **Acceptance**: Founder decision of 2026-10-07 in chat, recorded in [issue #735](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/735): a transient publish failure must leave the draft's photos usable for a retry; a permanently unusable photo is named and only that upload is retired.
- **Supersedes**: [ADR-0088](0088-exclusive-upload-adoption-and-retirement.md) §"A failed preparation is terminal", for publish only. Every other ADR-0088 rule stands: the common claim, one adopter under concurrency, fenced deletion, and retirement with recorded cleanup. ADR-0088 itself is not edited.

## Context

ADR-0088 made every failed preparation terminal: any error after `PublishListing` reserved the draft's photos retired all of them. One bad image, or a transient storage or database failure, killed every photo in the draft. The draft kept the dead keys, every later publish answered `UPLOAD_NOT_AVAILABLE`, and the seller had to re-upload all photos with no explanation. The Spec review of PR #722 found this (P2); the code matched its decision, so the decision is what changes. The app has no released users, so no compatibility or backfill work is required.

## Decision

Publish distinguishes why preparation failed.

A publish that fails for a transient reason, such as a storage or database error or a timeout, releases its reservation. every upload the attempt still holds returns to `AVAILABLE` with the claim cleared and no deletion work recorded, so a retry of the same draft can adopt the same bytes. The original error propagates. Publish waits for every sibling generator to stop before releasing or settling the reservation.

A process crash, or a failed attempt to record release, leaves a claim until its deadline. The worker releases an expired publish claim to `AVAILABLE` with its claim cleared and no deletion work. Publish reserves a new Listing id that does not exist until publication commits with adoption; Attach reserves an existing Listing, and Profile Photo reserves a `profile` target. The worker uses those facts under the upload row lock to distinguish stranded publish from the terminal preparations in ADR-0088. It skips any upload referenced by live Listing media, a poster, or a Profile Photo, including retained keys without upload links. A committed publish is already `ADOPTED` and is skipped.

If one photo is permanently unusable, publish names that photo in the error using the draft's own reference and retires only that upload, with its deletion work recorded. The stored object may not be an image, may be corrupt, or may never fit the upload cap. Every other photo is released and stays adoptable. Before reservation, only a positive mismatch in a present, non-empty object, a wrong content type or a size above the cap, authorizes retirement. The caller's User id, AVAILABLE state and absence of adopters are checked under the upload row lock, and storage is re-inspected while that lock is held. A missing, empty or corrected object authorizes no retirement; a conditional PUT may still be pending. Missing and empty objects remain retryable refusals. The variant generator reports such bytes as `UPLOAD_OBJECT_INVALID`; transport and resource failures never carry that code. Metadata reading and later pixel decoding are both checked: only known decode/format failures and an image that cannot fit the cap are permanent; an unknown Sharp failure stays transient. HTTP `UPLOAD_OBJECT_INVALID` details expose `key`, plus the draft's `photoId` for publish. The authorizing upload id stays in a typed application error and is never a client field. Attach and Profile Photo expose the same key details.

Exclusivity from ADR-0088 is unchanged. Only the attempt that created the claim token releases or settles it; a joined retry touches nothing. Releasing and retiring touch only uploads the token still holds in `PREPARING`: an upload already `ADOPTED` by a committed attempt, held by another attempt, or referenced by a live owner is never retired or cleared. While a retry holds the released photos again, no other target can adopt them. Retiring an upload before any reservation requires the authorized User, an unreferenced `AVAILABLE` upload and the positive storage recheck under its lock.

Attach and Profile Photo preparations keep the terminal rule of ADR-0088.

## Consequences

### Positive

- A transient outage no longer costs the seller their photos; a retry of the same draft publishes with the same bytes.
- A permanently unusable photo is named, so the seller re-adds exactly one photo instead of re-uploading all of them with no explanation.
- The unusable upload is retired once, so it cannot block every later retry.

### Negative / accepted costs

- Publish must classify failures: only `UPLOAD_OBJECT_INVALID` from generation is permanent. A permanent condition misclassified as transient leaves the draft retryable but failing; the preparation deadline and worker recovery release stranded publish claims for retry.
- Two settlement paths (release, settle) replace one terminal path and must both preserve the single-adopter invariant under concurrency.

### Neutral

- The three-photo minimum and twenty maximum are unchanged.
- Mobile answers `UPLOAD_NOT_AVAILABLE` and `UPLOAD_OBJECT_INVALID` with a message naming the Photos step, in EN, RU and TK.

## Alternatives considered

- **Keep failed preparations terminal (ADR-0088 as written).** Rejected by the founder: a transient failure must not destroy usable photos.
- **Release on every failure, never retire mid-publish.** Rejected: a permanently unusable photo would make every retry fail the same way, with no upload ever cleaned up.
- **Retry inside the request.** Rejected: it prolongs locks and hides storage outages from the seller; the draft already survives for an explicit retry.

## References

- [Issue #735](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/735), including the 2026-10-07 founder decision.
- [ADR-0088](0088-exclusive-upload-adoption-and-retirement.md), the common claim and the superseded terminal rule.
- [Issue #721](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/721), exclusive upload adoption.
