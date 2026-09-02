import { describe, expect, it } from "vitest";

import { buildApnsNotification } from "./ApnsSender";

/**
 * Guards the actual APNS wire shape. The mobile app reads the deep link from
 * `notification.request.content.data.deepLink`, which maps to a root-level
 * `deepLink` key in the APNS JSON alongside `aps`.
 */
describe("buildApnsNotification wire payload", () => {
  it("carries the conversation deep link at the APNS payload root", async () => {
    const notification = await buildApnsNotification("tm.auto.app", {
      token: "ios-token",
      title: "Новое сообщение",
      body: "Hello",
      data: {
        deepLink: "/conversations/conv-1",
        conversationId: "conv-1",
        messageId: "msg-1",
      },
    });

    // `toJSON` exists at runtime but is absent from node-apn's typings.
    const json = asJson(notification);

    expect(json["deepLink"]).toBe("/conversations/conv-1");
    expect(json["conversationId"]).toBe("conv-1");
    expect(json["messageId"]).toBe("msg-1");
  });

  it("renders an alert with the title and body", async () => {
    const notification = await buildApnsNotification("tm.auto.app", {
      token: "ios-token",
      title: "Новое сообщение",
      body: "Hello",
      data: {},
    });

    const json = asJson(notification) as {
      aps?: { alert?: { title?: string; body?: string } };
    };

    expect(json.aps?.alert).toEqual({
      title: "Новое сообщение",
      body: "Hello",
    });
  });
});

function asJson(notification: unknown): Record<string, unknown> {
  return (
    notification as { toJSON(): Record<string, unknown> }
  ).toJSON();
}
