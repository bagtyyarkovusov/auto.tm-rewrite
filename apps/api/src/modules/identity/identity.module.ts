import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityController } from "./presentation/identity.controller";
import { AuthController } from "./presentation/AuthController";
import { RequestOtp } from "./application/RequestOtp";
import { VerifyOtp } from "./application/VerifyOtp";
import { RefreshSession } from "./application/RefreshSession";
import { PrismaOtpRequestRepository } from "./infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "./infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "./infrastructure/PrismaSessionRepository";
import { HttpOtpSenderAdapter } from "./infrastructure/HttpOtpSenderAdapter";
import { BcryptHasherAdapter } from "./infrastructure/BcryptHasherAdapter";
import { SystemClockAdapter } from "./infrastructure/SystemClockAdapter";
import { IDENTITY_TOKENS } from "./identity.tokens";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
      signOptions: {
        expiresIn: (process.env["JWT_ACCESS_TTL"] ?? "15m") as number | `${number}${"s" | "m" | "h" | "d"}`,
      },
    }),
  ],
  controllers: [IdentityController, AuthController],
  providers: [
    PrismaOtpRequestRepository,
    PrismaUserRepository,
    PrismaSessionRepository,
    HttpOtpSenderAdapter,
    BcryptHasherAdapter,
    SystemClockAdapter,
    {
      provide: IDENTITY_TOKENS.OtpTestMode,
      useFactory: () => process.env["OTP_TEST_MODE"] === "true",
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
  ],
  exports: [
    // Ports consumed by other bounded contexts will be exported here once implemented.
  ],
})
export class IdentityModule {}
