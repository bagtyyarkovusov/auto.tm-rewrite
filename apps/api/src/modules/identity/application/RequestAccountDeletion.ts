import { createHash } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import {
  OtpAttemptLedger,
  SIGN_IN_CODE_RATE_POLICY,
} from "../domain/OtpAttemptLedger";
import { OtpCode } from "../domain/OtpCode";
import { signInCodeDestination } from "../domain/SignInCodeDestination";
import { SIGN_IN_CODE_CHANNELS } from "../domain/types";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { EmailCodeSenderPort } from "../domain/ports/EmailCodeSenderPort";
import { EMAIL_CODE_SENDER_PORT } from "../domain/ports/EmailCodeSenderPort";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import type { SignInMethodRepository } from "../domain/ports/SignInMethodRepository";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { HttpOtpSenderAdapter } from "../infrastructure/HttpOtpSenderAdapter";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";

export type RequestAccountDeletionInput = (
  | { phone: string }
  | { email: string }
) & {
  ip: string;
  locale?: "ru" | "tk" | "en";
};

export interface RequestAccountDeletionResult {
  requestId: string;
  resendInSeconds: number;
  testCode?: string;
}

/**
 * Public web deletion request (ADR-0054). Always issues a real code, so the
 * answer is the same whether or not a User holds the value and reviewer
 * fixed codes never apply. The code is bound to the current holder, if any,
 * so it can only confirm deletion of that User.
 */
@Injectable()
export class RequestAccountDeletion {
  private readonly ledger = new OtpAttemptLedger(
    SIGN_IN_CODE_RATE_POLICY.destinationLimit,
    SIGN_IN_CODE_RATE_POLICY.ipLimit,
    SIGN_IN_CODE_RATE_POLICY.baseBackoffSeconds,
  );

  constructor(
    @Inject(PrismaOtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(PrismaUserRepository)
    private readonly userRepo: SignInMethodRepository,
    @Inject(HttpOtpSenderAdapter)
    private readonly otpSender: OtpSenderPort,
    @Inject(SystemClockAdapter)
    private readonly clock: ClockPort,
    @Inject(IDENTITY_TOKENS.OtpTestMode)
    private readonly testMode: boolean,
    @Inject(EMAIL_CODE_SENDER_PORT)
    private readonly emailCodeSender: EmailCodeSenderPort,
  ) {}

  async execute(
    input: RequestAccountDeletionInput,
  ): Promise<RequestAccountDeletionResult> {
    const destination = signInCodeDestination(input);
    const now = this.clock.now();
    const dayAgo = new Date(
      now.getTime() - SIGN_IN_CODE_RATE_POLICY.destinationWindowMs,
    );
    const hourAgo = new Date(
      now.getTime() - SIGN_IN_CODE_RATE_POLICY.ipWindowMs,
    );

    const [destinationCount24h, ipCount1h, latest] = await Promise.all([
      this.otpRequestRepo.countByDestinationSince(
        destination.channel,
        destination.value,
        dayAgo,
      ),
      this.otpRequestRepo.countByIpSince(input.ip, hourAgo),
      this.otpRequestRepo.findLatestByDestination(
        destination.channel,
        destination.value,
      ),
    ]);

    const rateCheck = this.ledger.check({
      destinationCount24h,
      ipCount1h,
      lastAttemptAt: latest?.createdAt ?? null,
      now,
    });
    if (!rateCheck.allowed) {
      throw new Error("Too many OTP requests");
    }

    const holder = destination.channel === SIGN_IN_CODE_CHANNELS.PHONE
      ? await this.userRepo.findByPhone(destination.value)
      : await this.userRepo.findByEmail(destination.value);

    const code = OtpCode.generate();
    const record = await this.otpRequestRepo.create({
      channel: destination.channel,
      destination: destination.value,
      codeHash: createHash("sha256").update(code.value).digest("hex"),
      expiresAt: destination.expiresAt(now),
      userId: holder?.id ?? null,
      ip: input.ip,
    });

    if (destination.channel === SIGN_IN_CODE_CHANNELS.PHONE) {
      await this.otpSender.send(destination.value, code.value);
    } else {
      await this.emailCodeSender.enqueue({
        requestId: record.id,
        email: destination.value,
        code: code.value,
        locale: input.locale ?? "ru",
        purpose: "account-deletion",
      });
    }

    return {
      requestId: record.id,
      resendInSeconds: rateCheck.resendInSeconds,
      ...(this.testMode ? { testCode: code.value } : {}),
    };
  }
}
