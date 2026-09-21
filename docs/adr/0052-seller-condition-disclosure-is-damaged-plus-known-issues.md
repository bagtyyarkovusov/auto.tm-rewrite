# ADR-0052: Seller condition disclosure is "Damaged / needs repair" plus known issues

- **Status**: Accepted
- **Date**: 2026-09-21
- **Deciders**: AutoTM founder
- **Amends**: the "structured honest condition disclosure" trust signal of [ADR-0037](0037-trust-inspection-competitive-wedge.md). The rest of ADR-0037 remains in force.

## Context

Sprint 9a shipped a structured condition disclosure on each Listing, as one of ADR-0037's software trust signals. The seller answers four structured questions, plus an optional free-text field:

- Was an accident reported?
- Is the mileage accurate?
- How many owners has the car had?
- Is a service history available?
- Known issues (free text).

The Listing detail screen shows every answer.

The founder reviewed the Listing detail content against Auto.ru in [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351), using capture AR-11-005 and the Auto.ru filter captures AR-02-005 and AR-06-006. Auto.ru's trustworthy condition data (accidents, owners, restrictions) comes from official registers looked up by VIN, not from the seller. What Auto.ru asks the seller is small: mainly whether the car is damaged ("битый"), which buyers can also filter on.

AutoTM has no official register data in Turkmenistan, so every answer is the seller's word and cannot be checked. Questions a buyer cannot verify at a viewing add reading without adding trust. "Mileage is accurate" restates the mileage figure the seller already entered, so it adds nothing. Owner count and service history were judged not useful to buyers.

AutoTM is not released. The Listings in every environment are fixtures and reviewer scenarios, so no real data depends on the current fields.

## Decision

**The seller condition disclosure has exactly two fields:**

- **Damaged / needs repair**: a yes/no answer (`damaged: boolean`). It describes the car's state today, not its accident history. It is **required to publish** a Listing and is kept when the Listing is edited.
- **Known issues**: optional free text (`knownIssuesText`, up to 1000 characters), as today.

Listing detail shows both under the heading **"Condition, as stated by the seller"**, so nobody reads them as verified.

**Removed:** accident reported, mileage accurate, owner count, and service history. They are removed from the Sell wizard, the draft payload, the contracts, the API, the database and Listing detail.

**No migration of existing data.** One Prisma migration drops the four columns and adds `damaged`. The column is nullable in the database only so the migration applies to environments that already hold Listings. The publish and edit use-cases enforce the requirement. The fixture and reviewer seed scripts set `damaged` on every Listing, and every environment is reseeded after the migration. Nothing maps old answers to the new field, and no fallback shows old answers.

**Not decided here:** an "Exclude damaged" filter in Search parameters. The approved screen map fixes the release filter set, so this needs a separate decision.

## Consequences

### Positive

- The seller answers one quick question instead of four, which shortens the Sell wizard's specs step.
- The field buyers care most about, and can check at a viewing, is always present.
- Listing detail loses three lines that looked like verified facts but were not.
- The data model matches what AutoTM can honestly show until inspection (ADR-0037) provides verified data.

### Negative / accepted costs

- Buyers lose seller-stated owner count and service history. They can still ask in a Conversation or read them in Known issues.
- The change touches the Prisma schema and a migration, `@auto-tm/contracts`, the API publish and edit use-cases and repository, the Sell wizard steps and translations, Listing detail, and the seed scripts. It must land in one coordinated slice.
- Every environment's Listings must be reseeded. This is acceptable only because no real Users or Listings exist yet.

### Neutral

- Inspection remains the route to verified condition data under ADR-0037.
- The VIN is still captured and shown as a specification row. Whether the VIN decode section stays is a separate decision.

## Alternatives considered

- **Keep all four structured answers.** Rejected. None can be verified, and the founder judged owner count and service history not useful.
- **Map "accident reported" onto "damaged".** Rejected. Accident history and current damage mean different things, and no real data needs keeping.
- **Keep the old columns unused and drop them later.** Rejected. With no released data, keeping them adds migration work and confusion for nothing.
- **Make "Damaged / needs repair" optional.** Rejected. An unanswered field on most Listings would weaken the one signal kept. Auto.ru requires it.

## References

- [ADR-0037](0037-trust-inspection-competitive-wedge.md)
- [ADR-0051](0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md)
- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [Prototype listing card and Listing detail content](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351) and its [resolution](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/351#issuecomment-5761811759)
- [Slice the approved discovery journey into implementation tickets](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/355)
- [API listings current state](../../apps/api/src/modules/listings/CONTEXT.md)
