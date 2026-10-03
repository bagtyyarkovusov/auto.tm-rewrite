import { Inject, Injectable } from "@nestjs/common";

import type { ContactPhoneCodeSent } from "../domain/ports/ContactPhoneCodePort";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { HttpOtpSenderAdapter } from "../infrastructure/HttpOtpSenderAdapter";

export interface IssueContactPhoneCodeInput {
  userId: string;
  phone: string;
  ip: string;
  locale: "ru" | "tk" | "en";
}

@Injectable()
export class IssueContactPhoneCode {
  constructor(
    @Inject(IDENTITY_TOKENS.OtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(HttpOtpSenderAdapter)
    private readonly otpSender: OtpSenderPort,
    @Inject(IDENTITY_TOKENS.ClockPort)
    private readonly clock: ClockPort,
    @Inject(IDENTITY_TOKENS.OtpTestMode)
    private readonly testMode: boolean,
  ) {}

  async execute(_input: IssueContactPhoneCodeInput): Promise<ContactPhoneCodeSent> {
    throw new Error("not implemented");
  }
}
