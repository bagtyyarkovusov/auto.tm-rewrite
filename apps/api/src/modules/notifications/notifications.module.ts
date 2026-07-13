import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityModule } from "../identity/identity.module";
import { NotificationsController } from "./presentation/notifications.controller";
import { RegisterPushToken } from "./application/RegisterPushToken";
import { RevokePushToken } from "./application/RevokePushToken";
import { ListPushTokens } from "./application/ListPushTokens";
import { EvaluateDirectMessagePush } from "./application/EvaluateDirectMessagePush";
import { MessageSentEventHandler } from "./application/MessageSentEventHandler";
import { PrismaPushTokenRepository } from "./infrastructure/PrismaPushTokenRepository";
import { PUSH_TOKEN_REPOSITORY } from "./domain/ports/PushTokenRepository";

@Module({
  imports: [EventEmitterModule, PrismaModule, IdentityModule],
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
    EvaluateDirectMessagePush,
    MessageSentEventHandler,
  ],
})
export class NotificationsModule {}
