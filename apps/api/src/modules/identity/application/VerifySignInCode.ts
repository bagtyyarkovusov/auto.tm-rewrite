import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";

import type { OtpRequest } from "../domain/OtpRequest";
import type { SignInCodeDestination } from "../domain/SignInCodeDestination";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { ClockPort } from "../domain/ports/ClockPort";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";

const MAX_ATTEMPTS = 5;

@Injectable()
export class VerifySignInCode {
  constructor(
    @Inject(PrismaOtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(SystemClockAdapter)
    private readonly clock: ClockPort,
  ) {}

  async execute(
    destination: SignInCodeDestination,
    code: string,
  ): Promise<OtpRequest> {
    const request = await this.otpRequestRepo.findLatestByDestination(
      destination.channel,
      destination.value,
    );
    if (!request) throw new Error("No Sign-in Code request found");
    if (request.verifiedAt !== null) {
      throw new Error("OTP code has already been used");
    }
    if (request.expiresAt < this.clock.now()) {
      throw new Error("OTP code has expired");
    }
    if (request.attempts >= MAX_ATTEMPTS) {
      throw new Error("Too many attempts");
    }

    const codeHash = createHash("sha256").update(code).digest("hex");
    if (request.codeHash === codeHash) return request;

    await this.otpRequestRepo.incrementAttempts(request.id);
    if (request.attempts + 1 >= MAX_ATTEMPTS) {
      throw new Error("Too many attempts");
    }
    throw new Error("Invalid OTP code");
  }
}
