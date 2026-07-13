import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { NotificationsSchemas } from "@auto-tm/contracts";

import type { DirectMessageNotification } from "../domain/DirectMessageNotification";
import type { PushQueuePort } from "../domain/ports/PushQueuePort";

export const DIRECT_MESSAGE_PUSH_QUEUE_NAME = "notification-fanout" as const;

@Injectable()
export class BullMqPushQueueProducer implements PushQueuePort {
  constructor(
    @InjectQueue(DIRECT_MESSAGE_PUSH_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async enqueue(
    notification: DirectMessageNotification,
    historyId: string,
  ): Promise<void> {
    await this.queue.add(NotificationsSchemas.DIRECT_MESSAGE_PUSH_JOB_NAME, {
      category: notification.category,
      recipientUserId: notification.userId,
      historyId,
      title: notification.title,
      body: notification.body,
      deepLink: notification.deepLink,
      data: notification.data,
    });
  }
}
