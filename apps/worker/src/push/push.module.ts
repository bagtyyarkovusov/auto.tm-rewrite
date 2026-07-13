import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ProcessDirectMessagePush } from "./application/ProcessDirectMessagePush";
import { FcmApnsPushTransport } from "./adapters/FcmApnsPushTransport";
import { TestPushTransport } from "./adapters/TestPushTransport";
import { PUSH_PORT } from "./domain/PushPort";
import { PUSH_DEVICE_STORE } from "./domain/PushDeviceStore";
import { NOTIFICATION_HISTORY_STORE } from "./domain/NotificationHistoryStore";
import { PrismaPushDeviceStore } from "./infrastructure/PrismaPushDeviceStore";
import { PrismaNotificationHistoryStore } from "./infrastructure/PrismaNotificationHistoryStore";

@Module({
  providers: [
    ProcessDirectMessagePush,
    PrismaPushDeviceStore,
    {
      provide: PUSH_DEVICE_STORE,
      useClass: PrismaPushDeviceStore,
    },
    PrismaNotificationHistoryStore,
    {
      provide: NOTIFICATION_HISTORY_STORE,
      useClass: PrismaNotificationHistoryStore,
    },
    {
      provide: PUSH_PORT,
      useFactory: (config: ConfigService) => {
        const transport = config.get<string>("PUSH_TRANSPORT");
        return transport === "test" ? new TestPushTransport() : new FcmApnsPushTransport();
      },
      inject: [ConfigService],
    },
  ],
  exports: [ProcessDirectMessagePush],
})
export class PushModule {}
