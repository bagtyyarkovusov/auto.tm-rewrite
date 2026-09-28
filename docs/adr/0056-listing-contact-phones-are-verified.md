# ADR-0056: Listing contact phones are verified

- **Status**: Accepted
- **Date**: 2026-09-22
- **Deciders**: AutoTM founder + AI architect
- **Supersedes**: the publishing and seller-trust parts of [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md): `PHONE_REQUIRED`, `IdentityCheckPort.hasVerifiedPhone`, the mobile "Add a phone" Sell step, and `phoneVerified = phoneVerifiedAt != null` as the seller-trust signal. The rest of ADR-0054 remains in force.

## Context

The Sell wizard's Step 7 has a free-text "Contact phone". It is not validated or verified, the Call button dials it, and Listing detail returns a constant "Phone verified" seller trust. A seller can therefore put a stranger's number on a Listing, which enables harassment and impersonation, and the badge vouches for a number nobody verified. ADR-0054's `PHONE_REQUIRED` checks only the account phone, so it does not close this gap.

Sellers also need to post with a number other than their sign-in phone, for example a relative's car, without changing their profile. Email-only Users should be able to sell without first adding an account phone. Nothing has been released, so there is no stored contact-phone data to preserve.

## Decision

**Every Listing's contact phone is verified by an SMS code, and a verified extra number can be reused for 7 days.**

### Choosing the contact phone

- The wizard pre-fills the contact phone with the seller's verified account phone when they have one. Keeping it needs no code.
- The seller may choose a different `+993` number without changing their profile. The wizard sends a 6-digit code to it, and the seller cannot continue until it is confirmed.
- A confirmed extra number is a verified contact phone of that seller for 7 days from confirmation. During that window the seller may use it on new Listings without a new code; afterwards the next use needs a fresh code.
- The wizard offers the account phone and every contact phone verified in the last 7 days as quick picks, each showing the days left.
- A verified contact phone never becomes a Sign-in Method. Several sellers may verify the same number, and it may be another User's sign-in phone, because each seller received the code.

### Enforcement

- The server rejects publishing, republishing, or editing a Listing unless its contact phone is either the seller's verified account phone or one of their contact phones verified in the last 7 days.
- A Listing keeps its contact phone after the 7 days end. The window only limits new uses.
- Email-only Users sell by verifying a contact phone in the wizard; no account phone is required. `PHONE_REQUIRED`, `hasVerifiedPhone` and the "Add a phone" step are dropped.

### Codes

- Contact-phone codes are 6 digits, SHA-256 hashed, expire after 5 minutes, allow 5 wrong attempts, and share ADR-0054's per-destination and per-IP budgets.
- Each code is bound to its purpose as well as its channel and destination. A contact-phone code cannot sign anyone in, and a sign-in code cannot verify a contact phone.
- The SMS text is purpose-specific, in Russian and Turkmen, and fits one SMS segment. It tells the recipient that the code lets someone show this number on a car listing and to share it only if they agreed. Final wording is set in the implementing ticket.

### Seller trust

- Listings show no per-Listing "Phone verified" badge, because every contact phone is verified.
- Listing detail shows one caption by the Call button saying that AutoTM verifies sellers' numbers by SMS, and the trust page explains it in full.

### Data

- Existing contact-phone values are discarded; nothing has been released.

## Consequences

### Positive

- A number only appears on a Listing if someone holding that SIM received the code.
- Sellers can post with a relative's or second number without touching their Sign-in Methods.
- Email-only Users can sell without a separate "Add a phone" step.
- Purpose-bound codes and purpose-specific SMS text stop "read me the code" tricks from turning into account takeover.

### Negative / accepted costs

- Each new extra number costs an SMS and adds a step to the wizard.
- The 7-day window means some sellers who reuse a number re-verify it.
- A seller can keep advertising a number after its owner withdraws consent, until the Listing is edited or archived.
- The approved Listing detail design (seller-card "Phone verified" badge) and the seller-trust port scope change.

### Neutral

- The glossary gains a term for the verified contact phone, distinct from the phone Sign-in Method, under ADR-0042.
- The listings PRD's phone-reuse detection keys on the verified contact phone.
- `CONTEXT.md` files change only when the implementation ships (ADR-0019).

## Alternatives considered

- **Always dial the account phone and drop the extra number.** Rejected: sellers need a second number without changing how they sign in.
- **Verify every extra number on every Listing.** Rejected: repeat sellers would pay an SMS per post; 7 days balances cost against stale consent.
- **Keep an unverified contact phone and badge only the account phone.** Rejected: it still lets anyone publish a stranger's number.
- **Keep a per-Listing "Phone verified" badge.** Rejected: it is always true, so it carries no information and clutters every card.
- **Reuse the sign-in SMS text.** Rejected: the recipient is often not the seller, and identical texts hide what a code authorizes.
- **Keep `PHONE_REQUIRED` for email-only sellers.** Rejected: a verified contact phone already proves a reachable number.

## References

- [ADR-0054](0054-phone-or-email-sign-in-share-one-user.md), [ADR-0006](0006-auth.md), [ADR-0020](0020-document-hierarchy-and-mutability.md), [ADR-0042](0042-domain-glossary-authority-and-mutability.md)
- [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351)
- [Show the real seller and a public ID on Listing detail](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/362)
- [Require a verified phone to publish a Listing](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/385)
- [Listings PRD](../prd/features/32-listings.md)
