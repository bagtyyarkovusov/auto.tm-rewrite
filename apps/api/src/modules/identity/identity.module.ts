import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

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
import { RecoverAccount } from "./application/RecoverAccount";
import { GetAdminTotpStatus } from "./application/GetAdminTotpStatus";
import { EnrollAdminTotp } from "./application/EnrollAdminTotp";
import { VerifyAdminTotp } from "./application/VerifyAdminTotp";
import { BlockUser } from "./application/BlockUser";
import { UnblockUser } from "./application/UnblockUser";
import { IsBlocked } from "./application/IsBlocked";
import { PrismaOtpRequestRepository } from "./infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "./infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "./infrastructure/PrismaSessionRepository";
import { PrismaTotpEnrollmentRepository } from "./infrastructure/PrismaTotpEnrollmentRepository";
import { HttpOtpSenderAdapter } from "./infrastructure/HttpOtpSenderAdapter";
import { BcryptHasherAdapter } from "./infrastructure/BcryptHasherAdapter";
import { SystemClockAdapter } from "./infrastructure/SystemClockAdapter";
import { PrismaIdentityCheckAdapter } from "./infrastructure/PrismaIdentityCheckAdapter";
import { PrismaIdentityReadAdapter } from "./infrastructure/PrismaIdentityReadAdapter";
import { PrismaIdentityAdminRepository } from "./infrastructure/PrismaIdentityAdminRepository";
import { PrismaBlockedUserRepository } from "./infrastructure/PrismaBlockedUserRepository";
import { AesGcmTotpSecretCipher } from "./infrastructure/AesGcmTotpSecretCipher";
import { OtplibTotpVerifier } from "./infrastructure/OtplibTotpVerifier";
import { InMemoryTotpThrottleAdapter } from "./infrastructure/InMemoryTotpThrottleAdapter";
import { PinoSecurityLoggerAdapter } from "./infrastructure/PinoSecurityLoggerAdapter";
import { PrismaAccountDeletionListingsAdapter } from "./infrastructure/PrismaAccountDeletionListingsAdapter";
import { NodeConstantTimeComparator } from "./infrastructure/NodeConstantTimeComparator";
import { parseReviewerOtpBypassConfig } from "./infrastructure/ReviewerOtpBypassConfigFactory";
import { EventEmitterIdentityEventBus } from "./infrastructure/EventEmitterIdentityEventBus";
import { IDENTITY_TOKENS } from "./identity.tokens";
import { IDENTITY_ADMIN_PORT } from "./domain/ports/IdentityAdminPort";
import { IDENTITY_READ_PORT } from "./domain/ports/IdentityReadPort";
import { ACCOUNT_DELETION_LISTINGS_PORT } from "./domain/ports/AccountDeletionListingsPort";
import { BLOCKED_USER_REPOSITORY } from "./domain/ports/BlockedUserRepository";
import { CONSTANT_TIME_COMPARATOR_PORT } from "./domain/ports/ConstantTimeComparatorPort";
import { REVIEWER_OTP_BYPASS_CONFIG } from "./domain/ports/ReviewerOtpBypassConfig";

@Module({
  imports: [
    EventEmitterModule,
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
    PrismaIdentityAdminRepository,
    PrismaBlockedUserRepository,
    AesGcmTotpSecretCipher,
    OtplibTotpVerifier,
    InMemoryTotpThrottleAdapter,
    PinoSecurityLoggerAdapter,
    PrismaAccountDeletionListingsAdapter,
    NodeConstantTimeComparator,
    EventEmitterIdentityEventBus,
    {
      provide: ACCOUNT_DELETION_LISTINGS_PORT,
      useClass: PrismaAccountDeletionListingsAdapter,
    },
    {
      provide: IDENTITY_TOKENS.OtpTestMode,
      useFactory: () => process.env["OTP_TEST_MODE"] === "true",
    },
    {
      provide: IDENTITY_TOKENS.IdentityCheckPort,
      useClass: PrismaIdentityCheckAdapter,
    },
    {
      provide: IDENTITY_READ_PORT,
      useClass: PrismaIdentityReadAdapter,
    },
    {
      provide: IDENTITY_ADMIN_PORT,
      useClass: PrismaIdentityAdminRepository,
    },
    {
      provide: BLOCKED_USER_REPOSITORY,
      useClass: PrismaBlockedUserRepository,
    },
    {
      provide: CONSTANT_TIME_COMPARATOR_PORT,
      useClass: NodeConstantTimeComparator,
    },
    {
      provide: REVIEWER_OTP_BYPASS_CONFIG,
      useFactory: () =>
        parseReviewerOtpBypassConfig({
          REVIEW_DEMO_ACCOUNT_ENABLED: process.env["REVIEW_DEMO_ACCOUNT_ENABLED"] === "true",
          REVIEW_DEMO_ACCOUNTS_JSON: process.env["REVIEW_DEMO_ACCOUNTS_JSON"] ?? "[]",
        }),
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
      useClass: EventEmitterIdentityEventBus,
    },
    RequestOtp,
    VerifyOtp,
    RefreshSession,
    Logout,
    LogoutAll,
    GetMe,
    DeleteMe,
    RecoverAccount,
    GetAdminTotpStatus,
    EnrollAdminTotp,
    VerifyAdminTotp,
    BlockUser,
    UnblockUser,
    IsBlocked,
  ],
  exports: [
    IDENTITY_TOKENS.IdentityCheckPort,
    IDENTITY_READ_PORT,
    IDENTITY_TOKENS.SessionRepository,
    IDENTITY_TOKENS.ClockPort,
    IDENTITY_ADMIN_PORT,
  ],
})
export class IdentityModule {}
