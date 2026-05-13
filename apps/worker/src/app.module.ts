import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { LoggerModule } from "nestjs-pino";

import { PrismaModule } from "./common/prisma.module";
import { EnvSchema } from "./env.schema";
import { VideoTranscodeProcessor } from "./queues/video-transcode.processor";
import { NotificationFanoutProcessor } from "./queues/notification-fanout.processor";
import { OrphanCleanupProcessor } from "./queues/orphan-cleanup.processor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (cfg) => EnvSchema.parse(cfg),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env["LOG_LEVEL"] ?? "info",
      },
    }),
    PrismaModule,
    BullModule.forRoot({
      connection: {
        url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
      },
    }),
    BullModule.registerQueue(
      { name: "video-transcode" },
      { name: "notification-fanout" },
      { name: "orphan-cleanup" },
    ),
  ],
  providers: [
    VideoTranscodeProcessor,
    NotificationFanoutProcessor,
    OrphanCleanupProcessor,
  ],
})
export class AppModule {}
