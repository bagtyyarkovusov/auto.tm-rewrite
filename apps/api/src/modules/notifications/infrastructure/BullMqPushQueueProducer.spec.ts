import { describe, it, expect, beforeEach } from "vitest";
import type { Queue } from "bullmq";
import { NotificationsSchemas } from "@auto-tm/contracts";

import { DirectMessageNotification } from "../domain/DirectMessageNotification";
import {
  BullMqPushQueueProducer,
  DIRECT_MESSAGE_PUSH_JOB_OPTIONS,
} from "./BullMqPushQueueProducer";

class FakeQueue {
  jobs: Array<{ name: string; data: unknown; opts?: unknown }> = [];

  async add(name: string, data: unknown, opts?: unknown): Promise<void> {
    this.jobs.push({ name, data, opts });
    return Promise.resolve();
  }
}

describe("BullMqPushQueueProducer", () => {
  let queue: FakeQueue;
  let producer: BullMqPushQueueProducer;

  beforeEach(() => {
    queue = new FakeQueue();
    producer = new BullMqPushQueueProducer(queue as unknown as Queue);
  });

  it("enqueues a direct-message job that matches the worker contract", async () => {
    const notification = DirectMessageNotification.create({
      recipientId: "11111111-1111-1111-1111-111111111111",
      conversationId: "conv-1",
      messageId: "msg-1",
      sentAt: new Date().toISOString(),
      messageKind: "text",
      messageBody: "Hello",
      messageMetadata: null,
      messageDeletedAt: null,
    });

    await producer.enqueue(
      notification,
      "22222222-2222-2222-2222-222222222222",
    );

    expect(queue.jobs).toHaveLength(1);

    const [job] = queue.jobs;
    expect(job?.name).toBe(
      NotificationsSchemas.DIRECT_MESSAGE_PUSH_JOB_NAME,
    );
    expect(job?.opts).toEqual(DIRECT_MESSAGE_PUSH_JOB_OPTIONS);

    const parsed = NotificationsSchemas.DirectMessagePushJobSchema.safeParse(
      job?.data,
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toMatchObject({
      category: "direct_messages",
      recipientUserId: "11111111-1111-1111-1111-111111111111",
      historyId: "22222222-2222-2222-2222-222222222222",
      title: "Новое сообщение",
      body: "Hello",
      deepLink: "/conversations/conv-1",
      data: {
        conversationId: "conv-1",
        messageId: "msg-1",
      },
    });
  });
});
