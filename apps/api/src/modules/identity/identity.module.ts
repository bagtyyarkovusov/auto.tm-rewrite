import { Module } from "@nestjs/common";

import { IdentityController } from "./presentation/identity.controller";

@Module({
  controllers: [IdentityController],
  // Providers added per S2 vertical slices:
  //   application/: RequestOtp, VerifyOtp, RefreshSession, Logout, LogoutAll, GetMe, DeleteMe
  //   infrastructure/: PrismaUserRepository, PrismaSessionRepository, PrismaOtpRequestRepository,
  //                    HttpOtpSenderAdapter, BcryptHasherAdapter, SystemClockAdapter
  providers: [],
  exports: [
    // Ports consumed by other bounded contexts (e.g., IdentityReadPort, IdentityCheckPort)
    // will be exported here once the infrastructure adapters are wired.
  ],
})
export class IdentityModule {}
