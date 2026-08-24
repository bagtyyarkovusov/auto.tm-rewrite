# AutoTM Domain Glossary

This document is the canonical English engineering vocabulary for AutoTM. It defines what domain terms mean; it does not describe implementation status, future capability, user-facing translations, or delivery scope.

Charter decisions and accepted ADRs take precedence over this glossary. When a vocabulary decision changes materially, update the glossary through the ADR process defined by [ADR-0042](../adr/0042-domain-glossary-authority-and-mutability.md).

## Cross-context

**Marketplace Role**

The platform-wide identity assigned to a User: buyer, seller, moderator, or admin. It is independent of any Dealership Member role.

_Avoid_: Account type, dealership role

## Identity

**User**

A phone-authenticated person with one Marketplace Role who can participate in AutoTM. Dealership permissions are not encoded in this identity.

_Avoid_: Account, customer

**Dealership Member**

The membership connecting a User to a Dealership and assigning an owner or sales role within that dealership. It is distinct from the User's Marketplace Role.

_Avoid_: Dealer user, dealer account

## Listings

**Listing**

A seller-owned vehicle offer presented for marketplace discovery. It carries the vehicle details, media, location, price, availability, and contact options.

_Avoid_: Advert, post

## Conversations

**Conversation**

A one-to-one buyer and seller thread scoped to a single Listing. A buyer can have at most one Conversation for the same Listing.

_Avoid_: Chat room, inbox thread

**Message**

A participant-authored or system-authored item within a Conversation. Its kind determines whether it contains text, an image, a listing reference, or system information.

_Avoid_: Chat

## Admin

**Content Report**

A moderation request submitted against a reportable marketplace target. It records the reason, resolution state, and moderation context without becoming the target itself.

_Avoid_: Complaint, support ticket
