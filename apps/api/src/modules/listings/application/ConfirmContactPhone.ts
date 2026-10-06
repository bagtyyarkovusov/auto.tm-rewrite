import { Inject, Injectable } from "@nestjs/common";

import {
  CONTACT_PHONE_CODE_PORT,
  IDENTITY_CLOCK_PORT,
  type ClockPort,
  type ContactPhoneCodePort,
} from "../../identity/identity.public";
import {
  VERIFIED_CONTACT_PHONE_REPOSITORY,
  type VerifiedContactPhoneRepository,
} from "../domain/ports/VerifiedContactPhoneRepository";
import { VerifiedContactPhone } from "../domain/VerifiedContactPhone";
import { confirmedContactPhone, type UsableContactPhone } from "./UsableContactPhone";

export interface ConfirmContactPhoneInput {
  userId: string;
  phone: string;
  code: string;
}

/**
 * Confirms a number with the seller's code and lets the seller reuse it for 7
 * days. Confirming again restarts the 7 days. Never changes the seller's
 * sign-in phone (ADR-0081).
 */
@Injectable()
export class ConfirmContactPhone {
  constructor(
    @Inject(CONTACT_PHONE_CODE_PORT)
    private readonly codes: ContactPhoneCodePort,
    @Inject(VERIFIED_CONTACT_PHONE_REPOSITORY)
    private readonly confirmations: VerifiedContactPhoneRepository,
    @Inject(IDENTITY_CLOCK_PORT)
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: ConfirmContactPhoneInput,
  ): Promise<UsableContactPhone & { source: "confirmed" }> {
    await this.codes.confirmCode(input);
    const saved = await this.confirmations.record(
      VerifiedContactPhone.create({
        sellerId: input.userId,
        phone: input.phone,
        confirmedAt: this.clock.now(),
      }),
    );
    return confirmedContactPhone(saved);
  }
}
