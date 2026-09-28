import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { LoggerModule } from "nestjs-pino";
import { AuthSchemas } from "@auto-tm/contracts";

import { PrismaModule } from "./common/prisma.module";
import { parseEnv } from "./env.schema";
import { PushModule } from "./push/push.module";
import { EmailModule } from "./email/email.module";
import { VideoTranscodeProcessor } from "./queues/video-transcode.processor";
import { NotificationFanoutProcessor } from "./queues/notification-fanout.processor";
import { EmailCodeProcessor } from "./queues/email-code.processor";
import { OrphanCleanupProcessor } from "./queues/orphan-cleanup.processor";
import { AccountPurgeProcessor } from "./queues/account-purge.processor";
import { AccountPurgeScheduler } from "./queues/account-purge.scheduler";
import { PurgeExpiredAccounts } from "./jobs/PurgeExpiredAccounts";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: parseEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env["LOG_LEVEL"] ?? "info",
      },
    }),
    PrismaModule,
    PushModule,
    EmailModule,
    BullModule.forRoot({
      connection: {
        url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
      },
    }),
    BullModule.registerQueue(
      { name: "video-transcode" },
      { name: "notification-fanout" },
      { name: "orphan-cleanup" },
      { name: "account-purge" },
      { name: AuthSchemas.EMAIL_CODE_QUEUE },
    ),
  ],
  providers: [
    VideoTranscodeProcessor,
    NotificationFanoutProcessor,
    EmailCodeProcessor,
    OrphanCleanupProcessor,
    AccountPurgeProcessor,
    AccountPurgeScheduler,
    PurgeExpiredAccounts,
  ],
})
export class AppModule {}
