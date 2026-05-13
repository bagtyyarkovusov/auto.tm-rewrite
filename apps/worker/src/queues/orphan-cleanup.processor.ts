import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

@Processor("orphan-cleanup")
export class OrphanCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(OrphanCleanupProcessor.name);

  async process(job: Job<unknown>): Promise<void> {
    this.logger.log(`[orphan-cleanup] sweep tick (job ${job.id})`);
    // MinIO unreferenced-object scan + delete lands in Sprint 8.
  }
}
