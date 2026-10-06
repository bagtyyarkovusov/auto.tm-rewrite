import type { VerifiedContactPhone } from "../domain/VerifiedContactPhone";

/** A number the seller may put on a Listing now, as the contact-phone endpoints describe it. */
export type UsableContactPhone =
  | { phone: string; source: "account"; confirmedAt: null; reusableUntil: null }
  | { phone: string; source: "confirmed"; confirmedAt: Date; reusableUntil: Date };

export function accountContactPhone(phone: string): UsableContactPhone {
  return { phone, source: "account", confirmedAt: null, reusableUntil: null };
}

export function confirmedContactPhone(
  confirmation: VerifiedContactPhone,
): UsableContactPhone & { source: "confirmed" } {
  return {
    phone: confirmation.phone,
    source: "confirmed",
    confirmedAt: confirmation.confirmedAt,
    reusableUntil: confirmation.reusableUntil,
  };
}
