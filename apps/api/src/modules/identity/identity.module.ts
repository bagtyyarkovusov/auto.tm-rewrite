import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityController } from "./presentation/identity.controller";
import { AuthController } from "./presentation/AuthController";
import { RequestOtp } from "./application/RequestOtp";
import { PrismaOtpRequestRepository } from "./infrastructure/PrismaOtpRequestRepository";
import { HttpOtpSenderAdapter } from "./infrastructure/HttpOtpSenderAdapter";
import { SystemClockAdapter } from "./infrastructure/SystemClockAdapter";
import { IDENTITY_TOKENS } from "./identity.tokens";

@Module({
  imports: [PrismaModule],
  controllers: [IdentityController, AuthController],
  providers: [
    PrismaOtpRequestRepository,
    HttpOtpSenderAdapter,
    SystemClockAdapter,
    {
      provide: IDENTITY_TOKENS.OtpTestMode,
      useValue: process.env["OTP_TEST_MODE"] === "true",
    },
    RequestOtp,
  ],
  exports: [
    // Ports consumed by other bounded contexts will be exported here once implemented.
  ],
})
export class IdentityModule {}
