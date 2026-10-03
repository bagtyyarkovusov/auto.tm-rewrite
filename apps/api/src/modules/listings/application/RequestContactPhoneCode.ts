import { Inject, Injectable } from "@nestjs/common";

import {
  CONTACT_PHONE_CODE_PORT,
  IDENTITY_CLOCK_PORT,
  type ClockPort,
  type ContactPhoneCodePort,
} from "../../identity/identity.public";
import { ContactPhonePolicy } from "../domain/ContactPhonePolicy";
import type { UsableContactPhone } from "./UsableContactPhone";

export interface RequestContactPhoneCodeInput {
  userId: string;
  phone: string;
  ip: string;
  locale: "ru" | "tk" | "en";
}

export type RequestContactPhoneCodeResult =
  | { status: "confirmed"; contactPhone: UsableContactPhone }
  | { status: "code_sent"; requestId: string; resendInSeconds: number; testCode?: string };

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

  async execute(_input: RequestContactPhoneCodeInput): Promise<RequestContactPhoneCodeResult> {
    throw new Error("not implemented");
  }
}
