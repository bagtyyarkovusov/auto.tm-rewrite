import type { Notification } from "@parse/node-apn";

import type { PushResult } from "../../domain/PushPort";
import type { ApnsCredentials } from "../credentials";

import type { ApnsResponse } from "./classifyApnsResponse";
import { classifyApnsResponse } from "./classifyApnsResponse";

/** Provider-neutral message shape handed to APNS. */
export interface ApnsMessage {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface ApnsSender {
  send(message: ApnsMessage): Promise<PushResult>;
}

/**
 * The single node-apn call this adapter depends on. Injecting it keeps
 * `ParseApnsSender` fully testable without credentials or network access.
 */
export type ApnsSendFn = (
  message: ApnsMessage,
) => Promise<ApnsResponse>;

export class ParseApnsSender implements ApnsSender {
  constructor(private readonly sendNotification: ApnsSendFn) {}

  async send(message: ApnsMessage): Promise<PushResult> {
    try {
      return classifyApnsResponse(await this.sendNotification(message));
    } catch (error) {
      // node-apn reports rejections in `failed`; a throw here is a local fault.
      return classifyApnsResponse({
        sent: [],
        failed: [{ device: message.token, error: error as Error }],
      });
    }
  }
}

/**
 * Builds the APNS notification actually put on the wire. Exported so the
 * payload shape — in particular the S10 `deepLink` key, which the mobile app
 * reads from `notification.request.content.data.deepLink` — is verifiable
 * without credentials or a network connection.
 */
export async function buildApnsNotification(
  topic: string,
  message: ApnsMessage,
): Promise<Notification> {
  const apn = await import("@parse/node-apn");
  const notification = new apn.Notification();
  notification.topic = topic;
  notification.pushType = "alert";
  notification.sound = "default";
  notification.alert = { title: message.title, body: message.body };
  notification.payload = message.data;
  return notification;
}

/**
 * Builds the node-apn send function from token-based credentials. Imported
 * lazily so the SDK is only loaded when `PUSH_TRANSPORT=fcm-apns`.
 */
export async function createApnsSendFn(
  credentials: ApnsCredentials,
): Promise<ApnsSendFn> {
  const apn = await import("@parse/node-apn");
  const provider = new apn.Provider({
    token: {
      key: credentials.privateKey,
      keyId: credentials.keyId,
      teamId: credentials.teamId,
    },
    production: credentials.production,
  });

  return async (message) => {
    const notification = await buildApnsNotification(
      credentials.bundleId,
      message,
    );

    return (await provider.send(
      notification,
      message.token,
    )) as unknown as ApnsResponse;
  };
}
