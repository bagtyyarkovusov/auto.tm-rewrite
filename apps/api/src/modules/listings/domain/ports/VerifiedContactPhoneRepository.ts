import type { VerifiedContactPhone } from "../VerifiedContactPhone";

export interface VerifiedContactPhoneRepository {
  find(sellerId: string, phone: string): Promise<VerifiedContactPhone | null>;

  /** Stores the confirmation, replacing `confirmedAt` of an earlier one for the same number. */
  record(confirmation: VerifiedContactPhone): Promise<VerifiedContactPhone>;

  /** Every number the seller confirmed, newest `confirmedAt` first, reusable or not. */
  listBySeller(sellerId: string): Promise<VerifiedContactPhone[]>;
}

export const VERIFIED_CONTACT_PHONE_REPOSITORY = Symbol(
  "VerifiedContactPhoneRepository",
);
