/** A number the seller may put on a Listing now, as the contact-phone endpoints describe it. */
export type UsableContactPhone =
  | { phone: string; source: "account"; confirmedAt: null; reusableUntil: null }
  | { phone: string; source: "confirmed"; confirmedAt: Date; reusableUntil: Date };
