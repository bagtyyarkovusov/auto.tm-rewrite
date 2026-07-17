import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { PrismaModule } from "../../common/prisma.module";
import { IdentityModule } from "../identity/identity.module";
import { ConversationsModule } from "../conversations/conversations.module";
import { RealtimeModule } from "../realtime/realtime.module";

import { NotificationsController } from "./presentation/notifications.controller";
import { RegisterPushToken } from "./application/RegisterPushToken";
import { RevokePushToken } from "./application/RevokePushToken";
import { ListPushTokens } from "./application/ListPushTokens";
import { EvaluateDirectMessagePush } from "./application/EvaluateDirectMessagePush";
import { DecideDirectMessageNotification } from "./application/DecideDirectMessageNotification";
import { MessageSentEventHandler } from "./application/MessageSentEventHandler";
import { PrismaPushTokenRepository } from "./infrastructure/PrismaPushTokenRepository";
import { PrismaNotificationHistoryRepository } from "./infrastructure/PrismaNotificationHistoryRepository";
import { BullMqPushQueueProducer } from "./infrastructure/BullMqPushQueueProducer";
import { PUSH_TOKEN_REPOSITORY } from "./domain/ports/PushTokenRepository";
import { NOTIFICATION_HISTORY_REPOSITORY } from "./domain/ports/NotificationHistoryRepository";
import { PUSH_QUEUE_PORT } from "./domain/ports/PushQueuePort";

@Module({
  imports: [
    EventEmitterModule,
    PrismaModule,
    IdentityModule,
    ConversationsModule,
    RealtimeModule,
    BullModule.registerQueue({
      name: "notification-fanout",
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    PrismaPushTokenRepository,
    {
      provide: PUSH_TOKEN_REPOSITORY,
      useClass: PrismaPushTokenRepository,
    },
    PrismaNotificationHistoryRepository,
    {
      provide: NOTIFICATION_HISTORY_REPOSITORY,
      useClass: PrismaNotificationHistoryRepository,
    },
    BullMqPushQueueProducer,
    {
      provide: PUSH_QUEUE_PORT,
      useClass: BullMqPushQueueProducer,
    },
    RegisterPushToken,
    RevokePushToken,
    ListPushTokens,
    EvaluateDirectMessagePush,
    DecideDirectMessageNotification,
    MessageSentEventHandler,
  ],
})
export class NotificationsModule {}
