import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";

import { OtpCode } from "../domain/OtpCode";
import { OtpAttemptLedger } from "../domain/OtpAttemptLedger";
import { findReviewerAccount } from "../domain/ReviewerSignIn";
import { signInCodeDestination } from "../domain/SignInCodeDestination";
import { SIGN_IN_CODE_CHANNELS } from "../domain/types";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import type { EmailCodeSenderPort } from "../domain/ports/EmailCodeSenderPort";
import { EMAIL_CODE_SENDER_PORT } from "../domain/ports/EmailCodeSenderPort";
import type { ReviewerOtpBypassConfig } from "../domain/ports/ReviewerOtpBypassConfig";
import { REVIEWER_OTP_BYPASS_CONFIG } from "../domain/ports/ReviewerOtpBypassConfig";
import type { ConstantTimeComparatorPort } from "../domain/ports/ConstantTimeComparatorPort";
import { CONSTANT_TIME_COMPARATOR_PORT } from "../domain/ports/ConstantTimeComparatorPort";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { HttpOtpSenderAdapter } from "../infrastructure/HttpOtpSenderAdapter";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";

const DESTINATION_LIMIT = 5;
const IP_LIMIT = 10;
const BASE_BACKOFF_S = 60;

export type RequestOtpInput = ({ phone: string } | { email: string }) & {
  ip: string;
  locale?: "ru" | "tk" | "en";
};

export interface RequestOtpResult {
  requestId: string;
  resendInSeconds: number;
  testCode?: string;
}

@Injectable()
export class RequestOtp {
  private readonly ledger = new OtpAttemptLedger(
    DESTINATION_LIMIT,
    IP_LIMIT,
    BASE_BACKOFF_S,
  );

  constructor(
    @Inject(PrismaOtpRequestRepository) private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(HttpOtpSenderAdapter) private readonly otpSender: OtpSenderPort,
    @Inject(SystemClockAdapter) private readonly clock: ClockPort,
    @Inject(IDENTITY_TOKENS.OtpTestMode) private readonly testMode: boolean,
    @Inject(EMAIL_CODE_SENDER_PORT)
    private readonly emailCodeSender: EmailCodeSenderPort,
    @Inject(REVIEWER_OTP_BYPASS_CONFIG)
    private readonly reviewerBypassConfig: ReviewerOtpBypassConfig,
    @Inject(CONSTANT_TIME_COMPARATOR_PORT)
    private readonly constantTimeComparator: ConstantTimeComparatorPort,
  ) {}

  async execute(input: RequestOtpInput): Promise<RequestOtpResult> {
    const destination = signInCodeDestination(input);

    const reservedAccount = findReviewerAccount(
      this.reviewerBypassConfig,
      this.constantTimeComparator,
      destination.channel,
      destination.value,
    );
    if (
      destination.channel === SIGN_IN_CODE_CHANNELS.PHONE &&
      reservedAccount !== null
    ) {
      return { requestId: randomUUID(), resendInSeconds: 0 };
    }

    const now = this.clock.now();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

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

    const code = destination.channel === SIGN_IN_CODE_CHANNELS.EMAIL && reservedAccount !== null
      ? OtpCode.create(reservedAccount.code)
      : OtpCode.generate();
    const codeHash = createHash("sha256").update(code.value).digest("hex");

    const record = await this.otpRequestRepo.create({
      channel: destination.channel,
      destination: destination.value,
      codeHash,
      expiresAt: destination.expiresAt(now),
      userId: null,
      ip: input.ip,
    });

    if (destination.channel === SIGN_IN_CODE_CHANNELS.PHONE) {
      await this.otpSender.send(destination.value, code.value);
    } else if (reservedAccount === null) {
      await this.emailCodeSender.enqueue({
        requestId: record.id,
        email: destination.value,
        code: code.value,
        locale: input.locale ?? "ru",
      });
    }

    const result: RequestOtpResult = {
      requestId: record.id,
      resendInSeconds: rateCheck.resendInSeconds,
    };

    if (this.testMode) {
      result.testCode = code.value;
    }

    return result;
  }
}
