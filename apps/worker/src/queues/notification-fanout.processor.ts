import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";

@Processor("notification-fanout")
export class NotificationFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanoutProcessor.name);

  async process(
    job: Job<{ category: string; payload: unknown }>,
  ): Promise<void> {
    this.logger.log(
      `[notification-fanout] received job ${job.id} category ${job.data.category}`,
    );
    // Saved-search match evaluation + per-recipient push enqueue lands in Sprint 8.
  }
}
