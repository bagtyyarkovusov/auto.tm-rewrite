import type { PushResult } from "../../domain/PushPort";
import type { FcmCredentials } from "../credentials";

import { classifyFcmError } from "./classifyFcmError";

/** Provider-neutral message shape handed to FCM. */
export interface FcmMessage {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface FcmSender {
  send(message: FcmMessage): Promise<PushResult>;
}

/**
 * The single firebase-admin call this adapter depends on. Injecting it keeps
 * `FirebaseFcmSender` fully testable without credentials or network access.
 */
export type FcmSendFn = (message: {
  token: string;
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: { priority: "high" };
}) => Promise<string>;

export class FirebaseFcmSender implements FcmSender {
  constructor(private readonly sendMessage: FcmSendFn) {}

  async send(message: FcmMessage): Promise<PushResult> {
    try {
      await this.sendMessage({
        token: message.token,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: "high" },
      });
      return { ok: true };
    } catch (error) {
      return classifyFcmError(error);
    }
  }
}

/**
 * Builds the firebase-admin send function from service-account credentials.
 * Imported lazily so the SDK is only loaded when `PUSH_TRANSPORT=fcm-apns`.
 */
export async function createFirebaseSendFn(
  credentials: FcmCredentials,
): Promise<FcmSendFn> {
  const { cert } = await import("firebase-admin/app");
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  const appName = "autotm-push";
  const existing = getApps().find((app) => app.name === appName);
  const app =
    existing ??
    initializeApp(
      {
        credential: cert({
          projectId: credentials.projectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }),
      },
      appName,
    );

  const messaging = getMessaging(app);
  return (message) => messaging.send(message);
}
