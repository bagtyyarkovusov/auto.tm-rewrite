import { ContactPhonePolicy } from "../../domain/ContactPhonePolicy";
import { VerifiedContactPhone } from "../../domain/VerifiedContactPhone";
import type { AccountPhonePort } from "../../domain/ports/AccountPhonePort";
import type { VerifiedContactPhoneRepository } from "../../domain/ports/VerifiedContactPhoneRepository";

/** Sign-in phones and confirmed contact phones, in memory, for use-case specs. */
export class InMemoryContactPhones
  implements AccountPhonePort, VerifiedContactPhoneRepository
{
  /** userId → sign-in phone. */
  readonly signInPhones = new Map<string, string>([["user-1", "+99361234567"]]);
  confirmations: VerifiedContactPhone[] = [];

  readonly policy = new ContactPhonePolicy(this, this);

  confirm(sellerId: string, phone: string, confirmedAt: Date): void {
    this.confirmations = this.confirmations.filter(
      (c) => !(c.sellerId === sellerId && c.phone === phone),
    );
    this.confirmations.push(
      VerifiedContactPhone.create({ sellerId, phone, confirmedAt }),
    );
  }

  async holdsSignInPhone(userId: string, phone: string): Promise<boolean> {
    return this.signInPhones.get(userId) === phone;
  }

  async find(sellerId: string, phone: string): Promise<VerifiedContactPhone | null> {
    return (
      this.confirmations.find((c) => c.sellerId === sellerId && c.phone === phone) ??
      null
    );
  }

  async record(confirmation: VerifiedContactPhone): Promise<VerifiedContactPhone> {
    this.confirm(confirmation.sellerId, confirmation.phone, confirmation.confirmedAt);
    return confirmation;
  }

  async listBySeller(sellerId: string): Promise<VerifiedContactPhone[]> {
    return this.confirmations
      .filter((c) => c.sellerId === sellerId)
      .sort((a, b) => b.confirmedAt.getTime() - a.confirmedAt.getTime());
  }
}
