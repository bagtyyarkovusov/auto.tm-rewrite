import type { ListingsSchemas } from "@auto-tm/contracts";

export type ContactPhoneSelection =
  | { kind: "none" }
  | { kind: "account" }
  | { kind: "confirmed"; daysLeft: number }
  | { kind: "current" }
  | { kind: "stale" };

export function resolveContactPhoneSelection(_args: {
  phone: string | undefined;
  accountPhone?: string | null;
  currentListingPhone?: string | null;
  confirmedPhones?: ListingsSchemas.VerifiedContactPhone[];
  now?: Date;
}): ContactPhoneSelection {
  return { kind: "none" };
}
