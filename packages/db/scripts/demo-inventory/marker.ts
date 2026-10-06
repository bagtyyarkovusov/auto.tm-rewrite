/**
 * The one marker every demo inventory row and object hangs off.
 *
 * Every id the seed writes starts with `DEMO_ID_PREFIX`: seller, Listing and media ids each have
 * their own block inside it. Demo sellers are the Users whose id starts with it. Nothing else
 * decides what the seed owns: the remover finds those Users and reaches every other row through them (their
 * Listings, and from those the media, favourites, Conversations, reports and Inspection
 * Interests). Stored photo objects all sit under `DEMO_OBJECT_PREFIX` in the `listing-photos`
 * bucket, which no upload path of the API writes to (presigned uploads go to `pending/`).
 *
 * The API draws every id as a random UUID v4, so a real row cannot land in this namespace. The
 * values keep the v4 shape because the API validates ids with `z.string().uuid()`.
 * `packages/db/CONTEXT.md` records the same rule.
 */
export const DEMO_ID_PREFIX = "de300703-0000-4000-8000-";

/** Key prefix of every stored photo object, in the `listing-photos` bucket. */
export const DEMO_OBJECT_PREFIX = "demo-inventory/";

const hex = (value: number, width: number) => value.toString(16).padStart(width, "0");

/** `de300703-0000-4000-8000-0000000000NN` */
export function demoSellerId(index: number): string {
  return `${DEMO_ID_PREFIX}0000${hex(index + 1, 8)}`;
}

/** `de300703-0000-4000-8000-0001000000NN` */
export function demoListingId(index: number): string {
  return `${DEMO_ID_PREFIX}0001${hex(index + 1, 8)}`;
}

/** `de300703-0000-4000-8000-00020000NNOO`: Listing NN, gallery position OO. */
export function demoMediaId(listingIndex: number, order: number): string {
  return `${DEMO_ID_PREFIX}0002${hex(listingIndex + 1, 6)}${hex(order, 2)}`;
}

/** True for any id the seed derives: seller, Listing or media. */
export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_ID_PREFIX);
}
