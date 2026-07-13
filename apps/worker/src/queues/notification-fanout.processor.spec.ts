import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Job } from "bullmq";

import type { DirectMessagePushInput } from "../push/domain/DirectMessagePushInput";

import { NotificationFanoutProcessor } from "./notification-fanout.processor";

function makeJob(data: unknown): Job {
  return {
    id: "job-1",
    name: "direct-message",
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
    };
    processor = new NotificationFanoutProcessor(fakeUseCase as never);
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
    const job = makeJob({ category: "saved_search_matches" });
    job.name = "saved-search-match";

    await processor.process(job);

    expect(calls).toHaveLength(0);
  });
});
