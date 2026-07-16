import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Job } from "bullmq";
import { NotificationsSchemas } from "@auto-tm/contracts";

import type { DirectMessagePushInput } from "../push/domain/DirectMessagePushInput";
import type { ProcessDirectMessagePush } from "../push/application/ProcessDirectMessagePush";

import { NotificationFanoutProcessor } from "./notification-fanout.processor";

const DIRECT_MESSAGE_PUSH_JOB_NAME =
  NotificationsSchemas.DIRECT_MESSAGE_PUSH_JOB_NAME;

function makeJob(data: unknown, name: string = DIRECT_MESSAGE_PUSH_JOB_NAME): Job {
  return {
    id: "job-1",
    name,
    data,
  } as unknown as Job;
}

describe("NotificationFanoutProcessor", () => {
  let calls: DirectMessagePushInput[];
  let processor: NotificationFanoutProcessor;

  beforeEach(() => {
    calls = [];
    const fakeUseCase = {
      execute: vi.fn(async (input: DirectMessagePushInput) => {
        calls.push(input);
      }),
    } as unknown as ProcessDirectMessagePush;
    processor = new NotificationFanoutProcessor(fakeUseCase);
  });

  it("consumes a direct-message job and forwards the payload", async () => {
    const data = {
      category: "direct_messages",
      recipientUserId: "11111111-1111-1111-1111-111111111111",
      historyId: "22222222-2222-2222-2222-222222222222",
      title: "Новое сообщение",
      body: "Hello",
      deepLink: "/conversations/conv-1",
      data: { conversationId: "conv-1", messageId: "msg-1" },
    };

    await processor.process(makeJob(data));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      historyId: "22222222-2222-2222-2222-222222222222",
      recipientUserId: "11111111-1111-1111-1111-111111111111",
      title: "Новое сообщение",
      body: "Hello",
      deepLink: "/conversations/conv-1",
      data: { conversationId: "conv-1", messageId: "msg-1" },
    });
  });

  it("silently skips an invalid direct-message payload", async () => {
    await processor.process(makeJob({ invalid: true }));

    expect(calls).toHaveLength(0);
  });

  it("silently skips unhandled job names", async () => {
    const job = makeJob({ category: "saved_search_matches" }, "saved-search-match");

    await processor.process(job);

    expect(calls).toHaveLength(0);
  });
});
