import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

import { MockEmailSender } from "./adapters/MockEmailSender";
import { ResendEmailSender, createResendSendFn } from "./adapters/resend/ResendEmailSender";
import { SendSignInCodeEmail } from "./application/SendSignInCodeEmail";
import { DAILY_SEND_CAP } from "./domain/DailySendCap";
import type { EmailSenderPort } from "./domain/EmailSenderPort";
import { EMAIL_SENDER_PORT } from "./domain/EmailSenderPort";
import { DEFAULT_EMAIL_DAILY_CAP, EMAIL_DRIVER } from "./domain/types";
import { RedisDailySendCap } from "./infrastructure/RedisDailySendCap";

const EMAIL_CAP_REDIS = Symbol("EmailCapRedis");

/**
 * Resolves the configured driver. The Resend SDK is only loaded for
 * `EMAIL_DRIVER=resend`, so the default `mock` boot needs no API key.
 * `env.schema.ts` has already required `RESEND_API_KEY` and `EMAIL_FROM`.
 */
export async function createEmailSender(config: ConfigService): Promise<EmailSenderPort> {
  if (config.get<string>("EMAIL_DRIVER") !== EMAIL_DRIVER.Resend) {
    return new MockEmailSender();
  }
  return new ResendEmailSender(
    await createResendSendFn(config.getOrThrow<string>("RESEND_API_KEY")),
    config.getOrThrow<string>("EMAIL_FROM"),
  );
}

@Module({
  providers: [
    SendSignInCodeEmail,
    {
      provide: EMAIL_SENDER_PORT,
      useFactory: createEmailSender,
      inject: [ConfigService],
    },
    {
      provide: EMAIL_CAP_REDIS,
      useFactory: (config: ConfigService) =>
        new Redis(config.getOrThrow<string>("REDIS_URL"), { lazyConnect: true }),
      inject: [ConfigService],
    },
    {
      provide: DAILY_SEND_CAP,
      useFactory: (redis: Redis, config: ConfigService) =>
        new RedisDailySendCap(
          redis,
          config.get<number>("EMAIL_DAILY_CAP") ?? DEFAULT_EMAIL_DAILY_CAP,
        ),
      inject: [EMAIL_CAP_REDIS, ConfigService],
    },
  ],
  exports: [SendSignInCodeEmail],
})
export class EmailModule implements OnApplicationShutdown {
  constructor(@Inject(EMAIL_CAP_REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
