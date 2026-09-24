import { Inject, Injectable } from "@nestjs/common";

import type { User } from "../domain/User";
import { signInCodeDestination } from "../domain/SignInCodeDestination";
import {
  IDENTITY_ERROR_CODES,
  IdentityDomainError,
  SIGN_IN_CODE_CHANNELS,
} from "../domain/types";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { SignInMethodRepository } from "../domain/ports/SignInMethodRepository";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";
import { VerifySignInCode } from "./VerifySignInCode";

export type ConfirmSignInMethodChangeInput = (
  | { phone: string }
  | { email: string }
) & {
  userId: string;
  code: string;
};

@Injectable()
export class ConfirmSignInMethodChange {
  constructor(
    @Inject(PrismaOtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(PrismaUserRepository)
    private readonly userRepo: SignInMethodRepository,
    @Inject(SystemClockAdapter)
    private readonly clock: ClockPort,
    @Inject(VerifySignInCode)
    private readonly verifySignInCode: VerifySignInCode,
  ) {}

  async execute(input: ConfirmSignInMethodChangeInput): Promise<User> {
    if (!(await this.userRepo.findById(input.userId))) {
      throw new Error("User not found");
    }

    const destination = signInCodeDestination(input);
    const request = await this.verifySignInCode.execute(destination, input.code);
    if (request.userId !== input.userId) {
      throw new Error("No Sign-in Method change request found");
    }

    const owner = destination.channel === SIGN_IN_CODE_CHANNELS.PHONE
      ? await this.userRepo.findByPhone(destination.value)
      : await this.userRepo.findByEmail(destination.value);
    if (owner !== null && owner.id !== input.userId) {
      await this.otpRequestRepo.markVerified(request.id, input.userId);
      throw new IdentityDomainError(
        IDENTITY_ERROR_CODES.SIGN_IN_METHOD_TAKEN,
        "Sign-in Method is already held by another User",
      );
    }

    let updated: User;
    try {
      updated = await this.userRepo.replaceSignInMethod({
        userId: input.userId,
        channel: destination.channel,
        destination: destination.value,
        verifiedAt: this.clock.now(),
      });
    } catch (error) {
      if (
        error instanceof IdentityDomainError &&
        error.code === IDENTITY_ERROR_CODES.SIGN_IN_METHOD_TAKEN
      ) {
        await this.otpRequestRepo.markVerified(request.id, input.userId);
      }
      throw error;
    }

    await this.otpRequestRepo.markVerified(request.id, input.userId);
    return updated;
  }
}
