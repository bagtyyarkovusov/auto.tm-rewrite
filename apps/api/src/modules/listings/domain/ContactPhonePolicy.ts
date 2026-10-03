import type { AccountPhonePort } from "./ports/AccountPhonePort";
import type { VerifiedContactPhoneRepository } from "./ports/VerifiedContactPhoneRepository";
import type { VerifiedContactPhone } from "./VerifiedContactPhone";

/** Whether a contact phone may go on a Listing now, and why not (ADR-0081). */
export type ContactPhoneStanding =
  | { kind: "account" }
  | { kind: "confirmed"; confirmation: VerifiedContactPhone }
  | { kind: "missing" }
  | { kind: "not_confirmed" }
  | { kind: "expired" };

export class ContactPhonePolicy {
  constructor(
    private readonly accountPhones: AccountPhonePort,
    private readonly confirmations: VerifiedContactPhoneRepository,
  ) {}

  async standing(
    _sellerId: string,
    _phone: string | null | undefined,
    _now: Date,
  ): Promise<ContactPhoneStanding> {
    throw new Error("not implemented");
  }
}
