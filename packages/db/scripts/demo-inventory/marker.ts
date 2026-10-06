/**
 * The one marker every demo inventory row and object hangs off.
 *
 * Demo sellers are the Users whose id starts with `DEMO_ID_PREFIX`. Nothing else decides what the
 * seed owns: the remover finds those Users and reaches every other row through them (their
 * Listings, and from those the media, favourites, Conversations, reports and Inspection
 * Interests). Stored photo objects all sit under `DEMO_OBJECT_PREFIX` in the `listing-photos`
 * bucket, which no upload path of the API writes to (presigned uploads go to `pending/`).
 *
 * The API draws every id as a random UUID v4, so a real row cannot land in this namespace. The
 * values keep the v4 shape because the API validates ids with `z.string().uuid()`.
 * `packages/db/CONTEXT.md` records the same rule.
 */
const NAMESPACE = "de300703-0000-4000-8000-";

/** Seller ids: `de300703-0000-4000-8000-0000000000NN`. */
export const DEMO_ID_PREFIX = `${NAMESPACE}0000`;

/** Key prefix of every stored photo object, in the `listing-photos` bucket. */
export const DEMO_OBJECT_PREFIX = "demo-inventory/";

const hex = (value: number, width: number) => value.toString(16).padStart(width, "0");

export function demoSellerId(index: number): string {
  return `${DEMO_ID_PREFIX}0000${hex(index + 1, 4)}`;
}

/** Listing ids sit beside the seller ids but outside `DEMO_ID_PREFIX`: `...-0001000000NN`. */
export function demoListingId(index: number): string {
  return `${NAMESPACE}0001${hex(index + 1, 8)}`;
}

export function demoMediaId(listingIndex: number, order: number): string {
  return `${NAMESPACE}0002${hex(listingIndex + 1, 6)}${hex(order, 2)}`;
}

/** True for any id the seed derives: seller, Listing or media. */
export function isDemoId(id: string): boolean {
  return id.startsWith(NAMESPACE);
}
