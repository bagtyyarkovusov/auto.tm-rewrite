import type { ListingsSchemas } from "@auto-tm/contracts";

import { contactPhoneDaysLeft } from "./contactPhoneDaysLeft";

/**
 * What the chosen contact phone is worth on publish (ADR-0081): the seller's
 * account phone, a number still inside its 7-day reuse window, the Listing's
 * own number while editing, or a stale saved number that must be confirmed
 * again. `pending` is a number the app cannot judge yet, because the
 * confirmed list is still loading or its request failed; it is not called
 * expired and does not hold Continue. The server repeats the check; this
 * drives the Contact step's rows and its Continue error.
 */
export type ContactPhoneSelection =
  | { kind: "none" }
  | { kind: "account" }
  | { kind: "confirmed"; daysLeft: number }
  | { kind: "current" }
  | { kind: "pending" }
  | { kind: "stale" };

export function resolveContactPhoneSelection(args: {
  phone: string | undefined;
  accountPhone?: string | null;
  currentListingPhone?: string | null;
  /** `undefined` while the list is not known: loading, or the request failed. */
  confirmedPhones?: ListingsSchemas.VerifiedContactPhone[];
  now?: Date;
}): ContactPhoneSelection {
  const phone = args.phone;
  if (!phone) return { kind: "none" };
  if (args.currentListingPhone && phone === args.currentListingPhone) {
    return { kind: "current" };
  }
  if (args.accountPhone && phone === args.accountPhone) {
    return { kind: "account" };
  }
  if (!args.confirmedPhones) return { kind: "pending" };
  const match = args.confirmedPhones.find((p) => p.phone === phone);
  if (match?.reusableUntil) {
    const daysLeft = contactPhoneDaysLeft(match.reusableUntil, args.now);
    if (daysLeft > 0) return { kind: "confirmed", daysLeft };
  }
  return { kind: "stale" };
}
