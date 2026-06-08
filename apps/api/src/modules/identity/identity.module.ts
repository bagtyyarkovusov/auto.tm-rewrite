import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityController } from "./presentation/identity.controller";
import { AuthController } from "./presentation/AuthController";
import { MeController } from "./presentation/MeController";
import { AdminAuthController } from "./presentation/AdminAuthController";
import { RequestOtp } from "./application/RequestOtp";
import { VerifyOtp } from "./application/VerifyOtp";
import { RefreshSession } from "./application/RefreshSession";
import { Logout } from "./application/Logout";
import { LogoutAll } from "./application/LogoutAll";
import { GetMe } from "./application/GetMe";
import { DeleteMe } from "./application/DeleteMe";
import { GetAdminTotpStatus } from "./application/GetAdminTotpStatus";
import { EnrollAdminTotp } from "./application/EnrollAdminTotp";
import { VerifyAdminTotp } from "./application/VerifyAdminTotp";
import { PrismaOtpRequestRepository } from "./infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "./infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "./infrastructure/PrismaSessionRepository";
import { PrismaTotpEnrollmentRepository } from "./infrastructure/PrismaTotpEnrollmentRepository";
import { HttpOtpSenderAdapter } from "./infrastructure/HttpOtpSenderAdapter";
import { BcryptHasherAdapter } from "./infrastructure/BcryptHasherAdapter";
import { SystemClockAdapter } from "./infrastructure/SystemClockAdapter";
import { PrismaIdentityCheckAdapter } from "./infrastructure/PrismaIdentityCheckAdapter";
import { PrismaIdentityReadAdapter } from "./infrastructure/PrismaIdentityReadAdapter";
import { AesGcmTotpSecretCipher } from "./infrastructure/AesGcmTotpSecretCipher";
import { OtplibTotpVerifier } from "./infrastructure/OtplibTotpVerifier";
import { InMemoryTotpThrottleAdapter } from "./infrastructure/InMemoryTotpThrottleAdapter";
import { PinoSecurityLoggerAdapter } from "./infrastructure/PinoSecurityLoggerAdapter";
import { IDENTITY_TOKENS } from "./identity.tokens";

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [IdentityController, AuthController, MeController, AdminAuthController],
  providers: [
    PrismaOtpRequestRepository,
    PrismaUserRepository,
    PrismaSessionRepository,
    PrismaTotpEnrollmentRepository,
    HttpOtpSenderAdapter,
    BcryptHasherAdapter,
    SystemClockAdapter,
    PrismaIdentityCheckAdapter,
    PrismaIdentityReadAdapter,
    AesGcmTotpSecretCipher,
    OtplibTotpVerifier,
    InMemoryTotpThrottleAdapter,
    PinoSecurityLoggerAdapter,
    {
      provide: IDENTITY_TOKENS.OtpTestMode,
      useFactory: () => process.env["OTP_TEST_MODE"] === "true",
    },
    {
      provide: IDENTITY_TOKENS.IdentityCheckPort,
      useClass: PrismaIdentityCheckAdapter,
    },
    {
      provide: IDENTITY_TOKENS.IdentityReadPort,
      useClass: PrismaIdentityReadAdapter,
    },
    {
      provide: IDENTITY_TOKENS.ClockPort,
      useExisting: SystemClockAdapter,
    },
    {
      provide: IDENTITY_TOKENS.SessionRepository,
      useExisting: PrismaSessionRepository,
    },
    {
      provide: IDENTITY_TOKENS.TotpSecretCipherPort,
      useClass: AesGcmTotpSecretCipher,
    },
    {
      provide: IDENTITY_TOKENS.TotpVerifierPort,
      useClass: OtplibTotpVerifier,
    },
    {
      provide: IDENTITY_TOKENS.TotpEnrollmentRepository,
      useExisting: PrismaTotpEnrollmentRepository,
    },
    {
      provide: IDENTITY_TOKENS.TotpThrottlePort,
      useClass: InMemoryTotpThrottleAdapter,
    },
    {
      provide: IDENTITY_TOKENS.SecurityLoggerPort,
      useClass: PinoSecurityLoggerAdapter,
    },
    {
      provide: "TOTP_SECRET_ENCRYPTION_KEY",
      useFactory: () => process.env["TOTP_SECRET_ENCRYPTION_KEY"] ?? "",
    },
    {
      provide: "TOTP_STEP_SECONDS",
      useFactory: () => 30,
    },
    {
      provide: "EventBus",
      useFactory: () => ({
        emit: (_event: string, _payload: unknown) => {
          // Stub — will be replaced by NestJS EventEmitter2 when event infrastructure lands.
        },
      }),
    },
    RequestOtp,
    VerifyOtp,
    RefreshSession,
    Logout,
    LogoutAll,
    GetMe,
    DeleteMe,
    GetAdminTotpStatus,
    EnrollAdminTotp,
    VerifyAdminTotp,
  ],
  exports: [
    IDENTITY_TOKENS.IdentityCheckPort,
    IDENTITY_TOKENS.IdentityReadPort,
    IDENTITY_TOKENS.SessionRepository,
    IDENTITY_TOKENS.ClockPort,
  ],
})
export class IdentityModule {}
