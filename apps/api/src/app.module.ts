import type { NestModule, MiddlewareConsumer } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

// import { PrismaModule } from "./common/prisma.module";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { GlobalErrorFilter } from "./common/error.filter";
import { HealthController } from "./common/health.controller";
import { EnvSchema } from "./env.schema";
import { IdentityModule } from "./modules/identity/identity.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ContentModule } from "./modules/content/content.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AdminModule } from "./modules/admin/admin.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { AcceptLanguageMiddleware } from "./common/accept-language.middleware";

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
    // PrismaModule,  // TODO(#16): re-enable when API is ESM or db package is compiled
    EventEmitterModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
       
      signOptions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JWT lib type
        expiresIn: (process.env["JWT_ACCESS_TTL"] ?? "15m") as any,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    IdentityModule,
    CatalogModule,
    ListingsModule,
    SubscriptionsModule,
    ConversationsModule,
    NotificationsModule,
    ContentModule,
    ReportsModule,
    AdminModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalErrorFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AcceptLanguageMiddleware)
      .forRoutes("api/v1/catalog/*");
  }
}
