# ADR-0049: Defer listing-detail share to chat until the recipient is chosen

- **Status**: Accepted
- **Date**: 2026-09-17
- **Deciders**: AutoTM founder + AI architect

## Context

The listing-detail "Share to chat" button sent a `post_ref` immediately. Its route opened a conversation tied to the listing, so sharing another seller's car sent that seller a card for their own car. The button's forward icon and label gave no warning that tapping it would send a message, and the user could not choose a recipient or review the message. Anonymous users went through OTP and the send happened after sign-in.

[Flow 63](../prd/flows/63-share-listing-in-chat.md) describes in-chat sharing from an existing conversation: choose a listing, then send it to that conversation. The listing-detail shortcut did not implement that flow. Standard platform sharing lets the user choose a destination and sends the listing URL `https://auto.tm/listings/{id}`, hard-coded in `ContactCtaBar.tsx`. The destination's availability is a separate launch check: this repository does not implement a web listing-detail route or Android App Links.

## Decision

Remove the listing-detail "Share to chat" button and its automatic-send route from the Google Play launch UI. Keep the platform Share action and the seller Message action. Keep the `post_ref` API contract and rendering so a later recipient-picker flow can use them without changing message data.

A future in-app share entry point must let the sender choose the conversation and explicitly confirm the send before creating a `post_ref` message.

## Consequences

### Positive

- A single tap on listing detail cannot send an unexpected message to the listing's seller.
- The launch UI presents only sharing actions whose destination is clear to the user.

### Negative / accepted costs

- Users cannot send a listing card inside AutoTM chat from listing detail until a recipient picker ships. They can share the listing URL through the platform share sheet, subject to the destination being available.

### Neutral

- Existing `post_ref` messages still render in conversations. The API and message schema remain intact.

## Alternatives considered

- **Keep the automatic send with clearer copy.** This would still send a listing to its own seller, which is rarely the intended recipient.
- **Build a recipient picker on the launch branch.** This is the target interaction, but it needs recipient selection, confirmation, error recovery, and an auth-resume design. It belongs in a separately reviewed UI slice rather than a release cleanup.

## References

- [Flow 63](../prd/flows/63-share-listing-in-chat.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- `apps/mobile/src/listings/components/ContactCtaBar.tsx`
