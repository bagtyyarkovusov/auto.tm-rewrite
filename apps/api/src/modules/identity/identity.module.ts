import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityController } from "./presentation/identity.controller";
import { AuthController } from "./presentation/AuthController";
import { MeController } from "./presentation/MeController";
import { RequestOtp } from "./application/RequestOtp";
import { VerifyOtp } from "./application/VerifyOtp";
import { RefreshSession } from "./application/RefreshSession";
import { Logout } from "./application/Logout";
import { LogoutAll } from "./application/LogoutAll";
import { GetMe } from "./application/GetMe";
import { DeleteMe } from "./application/DeleteMe";
import { PrismaOtpRequestRepository } from "./infrastructure/PrismaOtpRequestRepository";
import { PrismaUserRepository } from "./infrastructure/PrismaUserRepository";
import { PrismaSessionRepository } from "./infrastructure/PrismaSessionRepository";
import { HttpOtpSenderAdapter } from "./infrastructure/HttpOtpSenderAdapter";
import { BcryptHasherAdapter } from "./infrastructure/BcryptHasherAdapter";
import { SystemClockAdapter } from "./infrastructure/SystemClockAdapter";
import { PrismaIdentityCheckAdapter } from "./infrastructure/PrismaIdentityCheckAdapter";
import { IDENTITY_TOKENS } from "./identity.tokens";

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [IdentityController, AuthController, MeController],
  providers: [
    PrismaOtpRequestRepository,
    PrismaUserRepository,
    PrismaSessionRepository,
    HttpOtpSenderAdapter,
    BcryptHasherAdapter,
    SystemClockAdapter,
    PrismaIdentityCheckAdapter,
    {
      provide: IDENTITY_TOKENS.OtpTestMode,
      useFactory: () => process.env["OTP_TEST_MODE"] === "true",
    },
    {
      provide: IDENTITY_TOKENS.IdentityCheckPort,
      useClass: PrismaIdentityCheckAdapter,
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
  ],
  exports: [
    IDENTITY_TOKENS.IdentityCheckPort,
  ],
})
export class IdentityModule {}
