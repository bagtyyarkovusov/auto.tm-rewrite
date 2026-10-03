import { LISTING_ERROR_CODES, type ListingErrorCode } from "./types";

export type DamagedAnswer =
  | { ok: true; damaged: boolean }
  | { ok: false; code: ListingErrorCode; message: string };

/**
 * The Damaged / needs repair value a Listing stores (ADR-0052, amended by
 * ADR-0080). A Used Listing, or one without a Condition, needs the seller's
 * answer. A New Listing is not asked: it stores `false` when the answer is
 * missing and refuses `true`, because a damaged car is not New.
 */
export function resolveDamagedAnswer(
  condition: "new" | "used" | undefined,
  damaged: boolean | undefined,
): DamagedAnswer {
  if (condition === "new") {
    return damaged === true
      ? {
          ok: false,
          code: LISTING_ERROR_CODES.DAMAGED_NOT_ALLOWED_FOR_NEW,
          message: "A New car cannot be damaged. Choose Used for a damaged car.",
        }
      : { ok: true, damaged: false };
  }
  return damaged === undefined
    ? {
        ok: false,
        code: LISTING_ERROR_CODES.DAMAGED_REQUIRED,
        message: "Answer whether the car is damaged or needs repair.",
      }
    : { ok: true, damaged };
}
