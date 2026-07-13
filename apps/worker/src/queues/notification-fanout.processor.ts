import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { ProcessDirectMessagePush } from "../push/application/ProcessDirectMessagePush";

@Processor("notification-fanout")
export class NotificationFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanoutProcessor.name);

  constructor(
    @Inject(ProcessDirectMessagePush)
    private readonly processDirectMessagePush: ProcessDirectMessagePush,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `[notification-fanout] received job ${job.id} name ${job.name}`,
    );

    if (job.name === "direct-message") {
      const parsed = NotificationsSchemas.DirectMessagePushJobSchema.safeParse(
        job.data,
      );

      if (!parsed.success) {
        this.logger.error(
          { errors: parsed.error.flatten() },
          `[notification-fanout] invalid direct-message payload for job ${job.id}`,
        );
        return;
      }

      await this.processDirectMessagePush.execute({
        historyId: parsed.data.historyId,
        recipientUserId: parsed.data.recipientUserId,
        title: parsed.data.title,
        body: parsed.data.body,
        deepLink: parsed.data.deepLink,
        data: parsed.data.data,
      });
      return;
    }

    // Saved-search match evaluation + per-recipient push enqueue lands post-MLP.
    this.logger.log(
      `[notification-fanout] skipping unhandled job ${job.id} name ${job.name}`,
    );
  }
}
