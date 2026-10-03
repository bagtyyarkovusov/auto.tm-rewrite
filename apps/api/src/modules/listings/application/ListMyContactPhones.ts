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
import type { UsableContactPhone } from "./UsableContactPhone";

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

  async execute(_input: { userId: string }): Promise<{ items: UsableContactPhone[] }> {
    throw new Error("not implemented");
  }
}
