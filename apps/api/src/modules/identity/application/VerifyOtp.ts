import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Phone } from "../domain/Phone";
import type { OtpRequestRepository } from "../domain/ports/OtpRequestRepository";
import type { UserRepository } from "../domain/ports/UserRepository";
import type { SessionRepository } from "../domain/ports/SessionRepository";
import type { PasswordHasherPort } from "../domain/ports/PasswordHasherPort";
import type { ClockPort } from "../domain/ports/ClockPort";
import { PrismaOtpRequestRepository } from "../infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "../infrastructure/PrismaSessionRepository";
import { BcryptHasherAdapter } from "../infrastructure/BcryptHasherAdapter";
import { SystemClockAdapter } from "../infrastructure/SystemClockAdapter";

const MAX_ATTEMPTS = 6;
const MAX_SESSIONS = 10;
const REFRESH_TTL_DAYS = 30;

function hashSha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export interface VerifyOtpInput {
  phone: string;
  code: string;
  deviceLabel?: string;
  userAgent?: string;
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    role: string;
  };
}

@Injectable()
export class VerifyOtp {
  constructor(
    @Inject(PrismaOtpRequestRepository)
    private readonly otpRequestRepo: OtpRequestRepository,
    @Inject(PrismaUserRepository)
    private readonly userRepo: UserRepository,
    @Inject(PrismaSessionRepository)
    private readonly sessionRepo: SessionRepository,
    @Inject(BcryptHasherAdapter)
    private readonly hasher: PasswordHasherPort,
    @Inject(SystemClockAdapter)
    private readonly clock: ClockPort,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject("EventBus")
    private readonly eventBus: { emit: (event: string, payload: unknown) => void },
  ) {}

  async execute(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const phone = Phone.create(input.phone);

    const now = this.clock.now();
    const codeHash = hashSha256(input.code);

    const otpRequest = await this.otpRequestRepo.findLatestByPhone(phone.value);
    if (!otpRequest) {
      throw new Error("No OTP request found for this phone");
    }

    if (otpRequest.verifiedAt !== null) {
      throw new Error("OTP code has already been used");
    }

    if (otpRequest.expiresAt < now) {
      throw new Error("OTP code has expired");
    }

    if (otpRequest.attempts >= MAX_ATTEMPTS) {
      throw new Error("Too many attempts");
    }

    if (otpRequest.codeHash !== codeHash) {
      await this.otpRequestRepo.incrementAttempts(otpRequest.id);
      const newAttempts = otpRequest.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        throw new Error("Too many attempts");
      }
      throw new Error("Invalid OTP code");
    }

    // Find or create user
    const existingUser = await this.userRepo.findByPhone(phone.value);
    const isNewUser = !existingUser;
    const user = existingUser ?? (await this.userRepo.create({ phone: phone.value }));

    // Mark OTP as verified
    await this.otpRequestRepo.markVerified(otpRequest.id, user.id);

    // Emit UserRegistered for new users
    if (isNewUser) {
      this.eventBus.emit("UserRegistered", {
        userId: user.id,
        phone: user.phone,
      });
    }

    // Session cap: delete expired first, then evict oldest if still at cap
    const sessionCount = await this.sessionRepo.countByUserId(user.id);
    if (sessionCount > 0) {
      await this.sessionRepo.deleteExpiredByUserId(user.id);
    }

    const countAfterCleanup = await this.sessionRepo.countByUserId(user.id);
    if (countAfterCleanup >= MAX_SESSIONS) {
      await this.sessionRepo.deleteOldestByUserId(user.id);
    }

    // Generate refresh token
    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenHash = await this.hasher.hash(refreshToken);

    const expiresAt = new Date(
      now.getTime() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const session = await this.sessionRepo.create({
      userId: user.id,
      refreshTokenHash,
      deviceLabel: input.deviceLabel ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    });

    // Generate access token (JWT)
    const accessToken = this.jwtService.sign({
      sub: user.id,
      sid: session.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }
}
