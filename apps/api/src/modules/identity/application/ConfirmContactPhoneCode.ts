import { Inject, Injectable } from "@nestjs/common";

import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { VerifySignInCode } from "./VerifySignInCode";

export interface ConfirmContactPhoneCodeInput {
  userId: string;
  phone: string;
  code: string;
}

@Injectable()
export class ConfirmContactPhoneCode {
  constructor(
    @Inject(IDENTITY_TOKENS.OtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(VerifySignInCode)
    private readonly verifySignInCode: VerifySignInCode,
  ) {}

  async execute(_input: ConfirmContactPhoneCodeInput): Promise<void> {
    throw new Error("not implemented");
  }
}
