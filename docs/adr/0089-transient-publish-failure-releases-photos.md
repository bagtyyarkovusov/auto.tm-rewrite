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

A publish that fails for a transient reason — a storage or database error or a timeout — releases its reservation: every upload the attempt still holds returns to `AVAILABLE` with the claim cleared and no deletion work recorded, so a retry of the same draft can adopt the same bytes. The original error propagates.

A publish that fails because one photo is permanently unusable — the stored object is not an image, is corrupt, or can never fit the upload cap — names that photo in the error (the draft's own photo reference) and retires only that upload, with its deletion work recorded. Every other photo is released and stays adoptable. A provably unusable stored object found before any reservation is retired the same way, so it stops blocking every retry. The variant generator reports such bytes as `UPLOAD_OBJECT_INVALID`; transport failures never carry that code.

Exclusivity from ADR-0088 is unchanged. Only the attempt that created the claim token releases or settles it; a joined retry touches nothing. Releasing and retiring touch only uploads the token still holds in `PREPARING`: an upload already `ADOPTED` by a committed attempt, held by another attempt, or referenced by a live owner is never retired or cleared. While a retry holds the released photos again, no other target can adopt them. Retiring an upload before any reservation happens only while it is `AVAILABLE`.

Attach and Profile Photo preparations keep the terminal rule of ADR-0088.

## Consequences

### Positive

- A transient outage no longer costs the seller their photos; a retry of the same draft publishes with the same bytes.
- A permanently unusable photo is named, so the seller re-adds exactly one photo instead of re-uploading all of them with no explanation.
- The unusable upload is retired once, so it cannot block every later retry.

### Negative / accepted costs

- Publish must classify failures: only `UPLOAD_OBJECT_INVALID` from generation is permanent. A permanent condition misclassified as transient leaves the draft retryable but failing; the preparation deadline and storage scanner remain the backstop for stranded claims.
- Two settlement paths (release, settle) replace one terminal path and must both preserve the single-adopter invariant under concurrency.

### Neutral

- The three-photo minimum and twenty maximum are unchanged.
- Mobile answers `UPLOAD_NOT_AVAILABLE` with a message naming the Photos step, in EN, RU and TK.

## Alternatives considered

- **Keep failed preparations terminal (ADR-0088 as written).** Rejected by the founder: a transient failure must not destroy usable photos.
- **Release on every failure, never retire mid-publish.** Rejected: a permanently unusable photo would make every retry fail the same way, with no upload ever cleaned up.
- **Retry inside the request.** Rejected: it prolongs locks and hides storage outages from the seller; the draft already survives for an explicit retry.

## References

- [Issue #735](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/735), including the 2026-10-07 founder decision.
- [ADR-0088](0088-exclusive-upload-adoption-and-retirement.md), the common claim and the superseded terminal rule.
- [Issue #721](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/721), exclusive upload adoption.
