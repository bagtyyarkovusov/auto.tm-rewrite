import { Inject } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { PurgeExpiredAccounts } from "../jobs/PurgeExpiredAccounts";

@Processor("account-purge")
export class AccountPurgeProcessor extends WorkerHost {
  constructor(
    @Inject(PurgeExpiredAccounts) private readonly purgeJob: PurgeExpiredAccounts,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const now = new Date();
    const result = await this.purgeJob.execute({ now });
    // biome-ignore lint/suspicious/noConsole: worker processor logging
    console.log(`Account purge completed: ${result.purgedCount} users purged`);
  }
}
