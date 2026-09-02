import { describe, expect, it } from "vitest";

import type { PushPayload, PushResult } from "../domain/PushPort";
import { PUSH_PLATFORM, PUSH_RESULT_REASON } from "../domain/types";

import {
  DEEP_LINK_DATA_KEY,
  FcmApnsPushTransport,
  buildDataPayload,
} from "./FcmApnsPushTransport";
import type { ApnsMessage, ApnsSender } from "./apns/ApnsSender";
import { ParseApnsSender } from "./apns/ApnsSender";
import type { FcmMessage, FcmSender } from "./fcm/FcmSender";
import { FirebaseFcmSender } from "./fcm/FcmSender";

class RecordingSender implements FcmSender, ApnsSender {
  messages: Array<FcmMessage | ApnsMessage> = [];
  constructor(private readonly result: PushResult = { ok: true }) {}

  async send(message: FcmMessage | ApnsMessage): Promise<PushResult> {
    this.messages.push(message);
    return this.result;
  }
}

function makePayload(overrides?: Partial<PushPayload>): PushPayload {
  return {
    deviceToken: "token-1",
    platform: PUSH_PLATFORM.Android,
    title: "Новое сообщение",
    body: "Hello",
    deepLink: "/conversations/conv-1",
    data: { conversationId: "conv-1", messageId: "msg-1" },
    ...overrides,
  };
}

describe("FcmApnsPushTransport routing", () => {
  it("routes android tokens to FCM", async () => {
    const fcm = new RecordingSender();
    const apns = new RecordingSender();

    await new FcmApnsPushTransport(fcm, apns).send(makePayload());

    expect(fcm.messages).toHaveLength(1);
    expect(apns.messages).toHaveLength(0);
  });

  it("routes ios tokens to APNS", async () => {
    const fcm = new RecordingSender();
    const apns = new RecordingSender();

    await new FcmApnsPushTransport(fcm, apns).send(
      makePayload({ platform: PUSH_PLATFORM.Ios }),
    );

    expect(apns.messages).toHaveLength(1);
    expect(fcm.messages).toHaveLength(0);
  });

  it("routes web tokens to FCM", async () => {
    const fcm = new RecordingSender();
    const apns = new RecordingSender();

    await new FcmApnsPushTransport(fcm, apns).send(
      makePayload({ platform: PUSH_PLATFORM.Web }),
    );

    expect(fcm.messages).toHaveLength(1);
  });

  it("returns the provider result unchanged", async () => {
    const failure: PushResult = {
      ok: false,
      reason: PUSH_RESULT_REASON.InvalidToken,
    };
    const transport = new FcmApnsPushTransport(
      new RecordingSender(failure),
      new RecordingSender(),
    );

    expect(await transport.send(makePayload())).toEqual(failure);
  });
});

describe("buildDataPayload", () => {
  it("carries the S10 conversation deep link and message identifiers", () => {
    expect(buildDataPayload(makePayload())).toEqual({
      conversationId: "conv-1",
      messageId: "msg-1",
      [DEEP_LINK_DATA_KEY]: "/conversations/conv-1",
    });
  });

  it("stringifies non-string data values for both providers", () => {
    const data = buildDataPayload(
      makePayload({ data: { unread: 3, muted: false, meta: { a: 1 } } }),
    );

    expect(data).toMatchObject({
      unread: "3",
      muted: "false",
      meta: '{"a":1}',
    });
    expect(Object.values(data).every((v) => typeof v === "string")).toBe(true);
  });

  it("never lets job data displace the deep link", () => {
    const data = buildDataPayload(
      makePayload({ data: { [DEEP_LINK_DATA_KEY]: "/hijacked" } }),
    );

    expect(data[DEEP_LINK_DATA_KEY]).toBe("/conversations/conv-1");
  });
});

describe("provider senders", () => {
  it("FCM sends a high-priority notification with string data", async () => {
    const calls: unknown[] = [];
    const sender = new FirebaseFcmSender(async (message) => {
      calls.push(message);
      return "projects/autotm/messages/1";
    });

    const result = await sender.send({
      token: "token-1",
      title: "T",
      body: "B",
      data: { deepLink: "/conversations/c1" },
    });

    expect(result).toEqual({ ok: true });
    expect(calls[0]).toEqual({
      token: "token-1",
      notification: { title: "T", body: "B" },
      data: { deepLink: "/conversations/c1" },
      android: { priority: "high" },
    });
  });

  it("FCM classifies a thrown provider error", async () => {
    const sender = new FirebaseFcmSender(async () => {
      throw Object.assign(new Error("gone"), {
        code: "messaging/registration-token-not-registered",
      });
    });

    expect(await sender.send({ token: "t", title: "T", body: "B", data: {} })).toEqual(
      { ok: false, reason: PUSH_RESULT_REASON.InvalidToken },
    );
  });

  it("APNS classifies the resolved response", async () => {
    const sender = new ParseApnsSender(async (message) => ({
      sent: [{ device: message.token }],
      failed: [],
    }));

    expect(
      await sender.send({ token: "t", title: "T", body: "B", data: {} }),
    ).toEqual({ ok: true });
  });

  it("APNS treats a local throw as a retryable connection fault", async () => {
    const sender = new ParseApnsSender(async () => {
      throw new Error("write EPIPE");
    });

    expect(
      await sender.send({ token: "t", title: "T", body: "B", data: {} }),
    ).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Retryable,
      cause: "apns/connection-error",
    });
  });
});
