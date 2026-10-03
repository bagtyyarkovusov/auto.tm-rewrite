import { Inject, Injectable } from "@nestjs/common";

import {
  IDENTITY_CLOCK_PORT,
  type ClockPort,
} from "../../identity/identity.public";
import {
  ACCOUNT_PHONE_PORT,
  type AccountPhonePort,
} from "../domain/ports/AccountPhonePort";
import {
  VERIFIED_CONTACT_PHONE_REPOSITORY,
  type VerifiedContactPhoneRepository,
} from "../domain/ports/VerifiedContactPhoneRepository";
import { confirmedContactPhone, type UsableContactPhone } from "./UsableContactPhone";

/**
 * The seller's numbers whose 7 days have not ended, newest confirmation first.
 * Leaves out the sign-in phone: the app reads it from `GET /api/v1/me`.
 */
@Injectable()
export class ListMyContactPhones {
  constructor(
    @Inject(VERIFIED_CONTACT_PHONE_REPOSITORY)
    private readonly confirmations: VerifiedContactPhoneRepository,
    @Inject(ACCOUNT_PHONE_PORT)
    private readonly accountPhones: AccountPhonePort,
    @Inject(IDENTITY_CLOCK_PORT)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: { userId: string }): Promise<{ items: UsableContactPhone[] }> {
    const now = this.clock.now();
    const reusable = (await this.confirmations.listBySeller(input.userId)).filter(
      (confirmation) => confirmation.isReusableAt(now),
    );
    const isSignInPhone = await Promise.all(
      reusable.map((c) => this.accountPhones.holdsSignInPhone(input.userId, c.phone)),
    );
    return {
      items: reusable
        .filter((_, index) => !isSignInPhone[index])
        .map(confirmedContactPhone),
    };
  }
}
