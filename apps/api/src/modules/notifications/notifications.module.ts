import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma.module";
import { NotificationsController } from "./presentation/notifications.controller";
import { RegisterPushToken } from "./application/RegisterPushToken";
import { RevokePushToken } from "./application/RevokePushToken";
import { ListPushTokens } from "./application/ListPushTokens";
import { PrismaPushTokenRepository } from "./infrastructure/PrismaPushTokenRepository";
import { PUSH_TOKEN_REPOSITORY } from "./domain/ports/PushTokenRepository";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    PrismaPushTokenRepository,
    {
      provide: PUSH_TOKEN_REPOSITORY,
      useClass: PrismaPushTokenRepository,
    },
    RegisterPushToken,
    RevokePushToken,
    ListPushTokens,
  ],
})
export class NotificationsModule {}
