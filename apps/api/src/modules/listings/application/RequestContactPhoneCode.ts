import { Inject, Injectable } from "@nestjs/common";

import {
  CONTACT_PHONE_CODE_PORT,
  IDENTITY_CLOCK_PORT,
  type ClockPort,
  type ContactPhoneCodePort,
} from "../../identity/identity.public";
import { ContactPhonePolicy } from "../domain/ContactPhonePolicy";
import {
  accountContactPhone,
  confirmedContactPhone,
  type UsableContactPhone,
} from "./UsableContactPhone";

export interface RequestContactPhoneCodeInput {
  userId: string;
  phone: string;
  ip: string;
  locale: "ru" | "tk" | "en";
}

export type RequestContactPhoneCodeResult =
  | { status: "confirmed"; contactPhone: UsableContactPhone }
  | { status: "code_sent"; requestId: string; resendInSeconds: number; testCode?: string };

/**
 * Sends a code for a number the seller wants on a Listing, or answers that the
 * number is already usable and sends nothing (ADR-0081).
 */
@Injectable()
export class RequestContactPhoneCode {
  constructor(
    @Inject(ContactPhonePolicy)
    private readonly policy: ContactPhonePolicy,
    @Inject(CONTACT_PHONE_CODE_PORT)
    private readonly codes: ContactPhoneCodePort,
    @Inject(IDENTITY_CLOCK_PORT)
    private readonly clock: ClockPort,
  ) {}

  async execute(input: RequestContactPhoneCodeInput): Promise<RequestContactPhoneCodeResult> {
    const standing = await this.policy.standing(input.userId, input.phone, this.clock.now());
    if (standing.kind === "account") {
      return { status: "confirmed", contactPhone: accountContactPhone(input.phone) };
    }
    if (standing.kind === "confirmed") {
      return {
        status: "confirmed",
        contactPhone: confirmedContactPhone(standing.confirmation),
      };
    }

    const sent = await this.codes.requestCode(input);
    return { status: "code_sent", ...sent };
  }
}
