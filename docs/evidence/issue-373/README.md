# Issue 373 evidence

The issue reservation starts at `5a77104` on `agent/issue-373`. This worktree belongs to the Codex implementer at `/Users/bagtyyar/.codex/queue-worktrees/autotm-373-20260930-sol`.

## Acceptance plan

| Criterion | Planned evidence |
|---|---|
| Approved section order and absent fields | Render detail with complete and sparse fixtures; assert ordered visible text, grid versus rows, title, date/city, clamped description and More tap |
| Collapsing header and persistent actions | Render route, scroll past measured gallery, assert price/title and Back, Share, Favorite, overflow; tap share, copy and report |
| Seller identity and verification | Render real name, fallback, join month and city/place; verification criterion awaits resolution of ADR-0056 conflict |
| Public footer | Render ID, Published and Updated using API publicNumber and timestamps |
| Owner actions and private counts | Render buyer and owner; assert counts only for owner, original currency, sticky Edit/Mark sold, overflow Archive/Share/Delete |
| Missing listing | Render 404; tap Home and Back |
| Removed blocks and decoded VIN | Render absent, undecoded and decoded VIN; assert inspection entry and trust link absent |
| Call and auth actions | Tap Call while anonymous; tap Favorite, Message and Report and inspect pending auth action |
| Mobile gate and visual proof | Repository tests/typecheck, mobile lint, Expo alignment, iOS export; simulator buyer, anonymous, owner, sold, archived, 404, collapsed header and loading screenshots |
| Current-state overview | Update listings CONTEXT.md against implementation; docs-only red exemption |

Production changes wait for meaningful failing rendered tests under ADR-0070. Main does not yet contain the working rendered test setup owned by issue 457, PR 464. No setup error will be recorded as red behavior proof.

The approved listing-content prototype and release-screen-map evidence branches remain read-only. Ask the seller, photo viewer changes and card-cache loading are separate slices.

## Decisions and boundaries

- The issue asks for Phone verified in the seller card, but ADR-0056 and the current Listings PRD prohibit a per-Listing phone badge. The coordinator has been notified before implementation.
- API inspection-interest and VIN decoder code remain unchanged.
- The implementer owns iPhone 17 simulator `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13` after issue 458 released it. Runtime work will use fresh isolated services and API 3473 / Metro 8473, never the issue 458 stack.
- Context7 was resolved and queried for Reanimated, Expo SDK 55 / Router and React Native. Clipboard will receive its own lookup if selected.
