import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";

@Injectable()
export class AccountPurgeScheduler implements OnModuleInit {
  constructor(
    @InjectQueue("account-purge") private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Daily at 03:00 UTC
    await this.queue.upsertJobScheduler(
      "daily-account-purge",
      { pattern: "0 3 * * *" },
      { name: "purge", data: {} },
    );
  }
}
