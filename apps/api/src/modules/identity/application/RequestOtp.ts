import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

import { Phone } from "../domain/Phone";
import { OtpCode } from "../domain/OtpCode";
import { OtpAttemptLedger } from "../domain/OtpAttemptLedger";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { IDENTITY_TOKENS } from "../identity.tokens";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { HttpOtpSenderAdapter } from "../infrastructure/HttpOtpSenderAdapter";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const PHONE_LIMIT = 5;
const IP_LIMIT = 10;
const BASE_BACKOFF_S = 60;

export interface RequestOtpInput {
  phone: string;
  ip: string;
}

export interface RequestOtpResult {
  requestId: string;
  resendInSeconds: number;
  testCode?: string;
}

@Injectable()
export class RequestOtp {
  private readonly ledger = new OtpAttemptLedger(PHONE_LIMIT, IP_LIMIT, BASE_BACKOFF_S);

  constructor(
    @Inject(PrismaOtpRequestRepository) private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(HttpOtpSenderAdapter) private readonly otpSender: OtpSenderPort,
    @Inject(SystemClockAdapter) private readonly clock: ClockPort,
    @Inject(IDENTITY_TOKENS.OtpTestMode) private readonly testMode: boolean,
  ) {}

  async execute(input: RequestOtpInput): Promise<RequestOtpResult> {
    const phone = Phone.create(input.phone);

    const now = this.clock.now();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [phoneCount24h, ipCount1h, latest] = await Promise.all([
      this.otpRequestRepo.countByPhoneSince(phone.value, dayAgo),
      this.otpRequestRepo.countByIpSince(input.ip, hourAgo),
      this.otpRequestRepo.findLatestByPhone(phone.value),
    ]);

    const rateCheck = this.ledger.check({
      phoneCount24h,
      ipCount1h,
      lastAttemptAt: latest?.createdAt ?? null,
      now,
    });

    if (!rateCheck.allowed) {
      throw new Error("Too many OTP requests");
    }

    const code = OtpCode.generate();
    const codeHash = createHash("sha256").update(code.value).digest("hex");

    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    const record = await this.otpRequestRepo.create({
      phone: phone.value,
      codeHash,
      expiresAt,
      userId: null,
      ip: input.ip,
    });

    await this.otpSender.send(phone.value, code.value);

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
