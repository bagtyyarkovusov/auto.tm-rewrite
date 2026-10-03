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
import type { UsableContactPhone } from "./UsableContactPhone";

export interface ConfirmContactPhoneInput {
  userId: string;
  phone: string;
  code: string;
}

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

  async execute(_input: ConfirmContactPhoneInput): Promise<UsableContactPhone> {
    throw new Error("not implemented");
  }
}
