# ADR-0027: MLP beta scope before full marketplace MVP

- **Status**: Accepted
- **Date**: 2026-05-22
- **Deciders**: AutoTM founder + AI architect

## Context

The original Phase 1 roadmap described a broad marketplace MVP: identity, catalog, listings, search, rich chat, saved-search notifications, Garage, dealership showroom, blog, public web, admin dashboard, app-store readiness, async media processing, and full notification preferences.

That scope is coherent as a product ambition, but too broad for the first lovable release. It asks the team to build platform surface area before real users have proven the core marketplace loop:

1. A seller posts a real car.
2. A buyer finds the car.
3. The buyer contacts the seller.
4. AutoTM can moderate obvious abuse.

The risk is not only schedule. The risk is learning too late. Features like Garage, saved-search digests, blog follows, dealer showrooms, and notification categories all add maintenance cost before we know whether listings and contact are working in the Turkmenistan market.

ADR-0020 requires a new ADR for material PRD capability changes. This decision changes Phase 1 capability scope, so it is recorded here instead of silently editing the roadmap.

## Decision

**AutoTM will ship an MLP beta before the full marketplace MVP.**

The MLP beta keeps Phase 1 focused on the smallest complete marketplace loop:

- Phone OTP identity and anonymous browsing
- Catalog data needed for listings and filters
- Seller listing creation, edit, photos, browse, listing detail, mark sold
- Basic search and listing detail discovery
- Buyer-to-seller contact, reduced to a simple per-listing message thread or contact flow
- Minimal admin moderation for listings, users, and reports
- Public landing, public listing detail, legal pages, and private beta readiness

The following capabilities move out of the MLP beta and become post-MLP bets:

- Garage and dream-car flows
- Dealership showroom, PRO badge, and dealer-member management
- Saved searches and match notifications
- Full notification platform: 6 categories, in-app feed, digests, marketing, broadcast tooling
- Rich chat: images, post-card messages, read receipts, typing indicators, presence, quick replies, durable outbox
- Blog / Bortzhurnal
- Video upload, ffmpeg/HLS transcoding, and async media workers beyond what is required for photos
- Full admin dashboard beyond moderation essentials
- App-store polish beyond internal beta distribution
- Detailed Phase 2 / Phase 3 sprint commitments before launch learning

The deferred capabilities are not rejected. They are sequenced after the MLP beta based on observed usage:

- Build dealer/showroom work after dealers are actively posting.
- Build saved searches after buyers repeat the same searches manually.
- Build full notifications after direct-message/contact usage proves notification value.
- Build blog/community after marketplace activity exists.
- Build inspection reports when trust becomes the visible bottleneck.
- Build video/360/comparisons when visual inspection quality becomes the bottleneck.

## Consequences

### Positive

- **Shorter path to real learning.** The team validates the car marketplace loop before building adjacent platform features.
- **Less maintenance surface.** Fewer bounded-context integrations, queues, preferences, and UI states are required for beta.
- **Cleaner sprint appetite.** Pending sprints become fixed-time bets with variable scope instead of a large Phase 1 checklist.
- **Simpler admin and moderation.** Admin work focuses on keeping beta safe, not running the whole future business from day one.
- **Better post-MLP prioritization.** Deferred work returns only when real behavior shows the missing capability matters.

### Negative / accepted costs

- **Some charter Phase 1 items move later.** The roadmap no longer matches the original broad Phase 1 ambition exactly.
- **Early beta is less polished.** Buyers may not have saved-search notifications, favorites, rich chat, blog, or dealer showrooms yet.
- **Some scaffolded modules remain unused.** Empty or partially scaffolded contexts may stay in the repo while their product scope is deferred.
- **External messaging must be careful.** "MLP beta" is a private learning release, not the full public launch promise.

### Neutral

- Existing shipped sprints S1-S3 and in-progress S4 remain valid.
- No implemented domain invariants change. Any CONTEXT.md edits from this scope change are reference-only updates to planned-addition pointers, not changes to current-state code reality.
- Existing ADRs are not edited. This ADR supersedes the previous Phase 1 sequencing at the PRD/roadmap level only.

## Alternatives considered

- **Keep the original Phase 1 roadmap unchanged.** Rejected: too much platform work before learning; too many independent features for a small team to ship calmly.
- **Delete deferred modules and docs immediately.** Rejected: unnecessary churn. The right move is to stop betting on the scope, not to run a cleanup project.
- **Cut chat entirely and expose only phone calls.** Rejected for now: buyer-to-seller contact must be observable enough to learn whether the marketplace loop works. The MLP version can still be much simpler than rich real-time chat.
- **Keep saved searches but cut other platform features.** Rejected: saved-search matching requires subscriptions, notification transport, digest rules, and fan-out semantics. It is a strong post-MLP candidate, not beta-critical.

## References

- [ADR-0020](0020-document-hierarchy-and-mutability.md) — Document hierarchy and mutability rules
- [ADR-0019](0019-context-md-describes-current-state.md) — CONTEXT.md describes current state, not aspirational spec
- [03-roadmap.md](../prd/03-roadmap.md) — Updated MLP beta trajectory
- [02-phases.md](../prd/02-phases.md) — Updated phase scope
- `GRILL-OUTCOME.md` — Original broad marketplace charter
