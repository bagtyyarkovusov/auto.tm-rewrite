import { describe, expect, it } from "vitest";

import type { PushPayload } from "../../domain/PushPort";
import { PUSH_PLATFORM, PUSH_RESULT_REASON } from "../../domain/types";
import { FcmApnsPushTransport } from "../FcmApnsPushTransport";
import type { FcmMessage, FcmSender } from "../fcm/FcmSender";

import { UnprovisionedApnsSender } from "./UnprovisionedApnsSender";

class RecordingFcmSender implements FcmSender {
  messages: FcmMessage[] = [];

  async send(message: FcmMessage) {
    this.messages.push(message);
    return { ok: true } as const;
  }
}

function makePayload(overrides?: Partial<PushPayload>): PushPayload {
  return {
    deviceToken: "token-1",
    platform: PUSH_PLATFORM.Android,
    title: "Новое сообщение",
    body: "Hello",
    deepLink: "/conversations/conv-1",
    data: { conversationId: "conv-1" },
    ...overrides,
  };
}

describe("UnprovisionedApnsSender (PUSH_TRANSPORT=fcm, ADR-0047)", () => {
  it("fails permanently rather than pretending to deliver", async () => {
    expect(
      await new UnprovisionedApnsSender().send({
        token: "t",
        title: "T",
        body: "B",
        data: {},
      }),
    ).toEqual({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "APNS is not provisioned under PUSH_TRANSPORT=fcm",
    });
  });

  it("never reports INVALID_TOKEN, which would deactivate a healthy device", async () => {
    const result = await new UnprovisionedApnsSender().send({
      token: "t",
      title: "T",
      body: "B",
      data: {},
    });

    expect(result.ok).toBe(false);
    expect(result).not.toMatchObject({ reason: PUSH_RESULT_REASON.InvalidToken });
  });
});

describe("the fcm transport composition", () => {
  const transport = () =>
    new FcmApnsPushTransport(new RecordingFcmSender(), new UnprovisionedApnsSender());

  it("delivers android push normally", async () => {
    expect(await transport().send(makePayload())).toEqual({ ok: true });
  });

  it("delivers web push normally", async () => {
    expect(
      await transport().send(makePayload({ platform: PUSH_PLATFORM.Web })),
    ).toEqual({ ok: true });
  });

  it("fails ios push with a cause naming the transport", async () => {
    const result = await transport().send(
      makePayload({ platform: PUSH_PLATFORM.Ios }),
    );

    expect(result).toMatchObject({
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
    });
    expect(result).toHaveProperty("cause", expect.stringContaining("PUSH_TRANSPORT=fcm"));
  });
});
