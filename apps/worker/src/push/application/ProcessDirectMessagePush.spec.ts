import { describe, it, expect, beforeEach } from "vitest";

import type { ActivePushDevice, PushDeviceStore } from "../domain/PushDeviceStore";
import type {
  NotificationHistoryStatus,
  NotificationHistoryStore,
} from "../domain/NotificationHistoryStore";
import { TestPushTransport } from "../adapters/TestPushTransport";

import {
  ProcessDirectMessagePush,
  RetryablePushError,
} from "./ProcessDirectMessagePush";

class FakePushDeviceStore implements PushDeviceStore {
  devices: ActivePushDevice[] = [];
  invalidatedTokens: string[] = [];

  async listActiveForUser(_userId: string): Promise<ActivePushDevice[]> {
    return this.devices;
  }

  async invalidateToken(token: string): Promise<void> {
    this.invalidatedTokens.push(token);
  }
}

class FakeNotificationHistoryStore implements NotificationHistoryStore {
  updates: Array<{
    historyId: string;
    status: NotificationHistoryStatus;
    details?: Record<string, unknown>;
  }> = [];

  async updateStatus(
    historyId: string,
    status: NotificationHistoryStatus,
    details?: Record<string, unknown>,
  ): Promise<void> {
    this.updates.push({ historyId, status, ...(details ? { details } : {}) });
  }
}

function makeInput(overrides?: Partial<{
  historyId: string;
  recipientUserId: string;
  title: string;
  body: string;
  deepLink: string;
  data: Record<string, unknown>;
}>): {
  historyId: string;
  recipientUserId: string;
  title: string;
  body: string;
  deepLink: string;
  data: Record<string, unknown>;
} {
  return {
    historyId: "history-1",
    recipientUserId: "user-1",
    title: "Новое сообщение",
    body: "Hello",
    deepLink: "/conversations/conv-1",
    data: { conversationId: "conv-1", messageId: "msg-1" },
    ...overrides,
  };
}

describe("ProcessDirectMessagePush", () => {
  let pushPort: TestPushTransport;
  let deviceStore: FakePushDeviceStore;
  let historyStore: FakeNotificationHistoryStore;
  let useCase: ProcessDirectMessagePush;

  beforeEach(() => {
    pushPort = new TestPushTransport();
    deviceStore = new FakePushDeviceStore();
    historyStore = new FakeNotificationHistoryStore();
    useCase = new ProcessDirectMessagePush(
      pushPort,
      deviceStore,
      historyStore,
    );
  });

  it("delivers to every active device and records delivered status", async () => {
    deviceStore.devices = [
      { token: "token-a", platform: "ios" },
      { token: "token-b", platform: "android" },
    ];

    await useCase.execute(makeInput());

    expect(pushPort.deliveries).toHaveLength(2);

    const [first, second] = pushPort.deliveries;
    expect(first?.payload.deviceToken).toBe("token-a");
    expect(second?.payload.deviceToken).toBe("token-b");

    expect(historyStore.updates).toHaveLength(1);
    const [update] = historyStore.updates;
    expect(update?.status).toBe("delivered");
    expect(update?.details?.["results"]).toEqual([
      { token: "token-a", success: true },
      { token: "token-b", success: true },
    ]);
  });

  it("passes the expected payload to PushPort", async () => {
    deviceStore.devices = [{ token: "token-a", platform: "ios" }];

    await useCase.execute(makeInput());

    const [recorded] = pushPort.deliveries;
    expect(recorded?.payload).toEqual({
      deviceToken: "token-a",
      title: "Новое сообщение",
      body: "Hello",
      deepLink: "/conversations/conv-1",
      data: { conversationId: "conv-1", messageId: "msg-1" },
    });
  });

  it("records failed status and invalidates the token on permanent token failure", async () => {
    deviceStore.devices = [{ token: "bad-token", platform: "ios" }];
    pushPort.setResult("bad-token", { ok: false, reason: "INVALID_TOKEN" });

    await useCase.execute(makeInput());

    expect(deviceStore.invalidatedTokens).toEqual(["bad-token"]);

    const [update] = historyStore.updates;
    expect(update?.status).toBe("failed");
    expect(update?.details?.["results"]).toEqual([
      { token: "bad-token", success: false, error: "INVALID_TOKEN" },
    ]);
  });

  it("records failed status for a permanent non-token failure", async () => {
    deviceStore.devices = [{ token: "token-a", platform: "ios" }];
    pushPort.setResult("token-a", {
      ok: false,
      reason: "PERMANENT",
      cause: new Error("bad configuration"),
    });

    await useCase.execute(makeInput());

    const [update] = historyStore.updates;
    expect(update?.status).toBe("failed");
    expect(update?.details?.["results"]).toEqual([
      { token: "token-a", success: false, error: "PERMANENT" },
    ]);
  });

  it("throws RetryablePushError and leaves history pending on retryable failure", async () => {
    deviceStore.devices = [{ token: "token-a", platform: "ios" }];
    pushPort.setResult("token-a", {
      ok: false,
      reason: "RETRYABLE",
      cause: new Error("network timeout"),
    });

    await expect(useCase.execute(makeInput())).rejects.toBeInstanceOf(
      RetryablePushError,
    );

    const [update] = historyStore.updates;
    expect(update?.status).toBe("pending");
    expect(update?.details?.["results"]).toEqual([
      { token: "token-a", success: false, error: "RETRYABLE" },
    ]);
  });

  it("records failed status when the recipient has no active tokens", async () => {
    await useCase.execute(makeInput());

    expect(pushPort.deliveries).toHaveLength(0);
    expect(historyStore.updates).toHaveLength(1);

    const [update] = historyStore.updates;
    expect(update).toEqual({
      historyId: "history-1",
      status: "failed",
      details: { reason: "NO_TOKENS" },
    });
  });

  it("records delivered when at least one device succeeds even if another is invalid", async () => {
    deviceStore.devices = [
      { token: "good-token", platform: "ios" },
      { token: "bad-token", platform: "android" },
    ];
    pushPort.setResult("bad-token", { ok: false, reason: "INVALID_TOKEN" });

    await useCase.execute(makeInput());

    expect(deviceStore.invalidatedTokens).toEqual(["bad-token"]);

    const [update] = historyStore.updates;
    expect(update?.status).toBe("delivered");
  });
});
