import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";

@Processor("orphan-cleanup")
export class OrphanCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(OrphanCleanupProcessor.name);

  async process(): Promise<void> {
    const reason = "orphan-cleanup is not implemented; no work was performed";
    this.logger.error(reason);
    throw new UnrecoverableError(reason);
  }
}
