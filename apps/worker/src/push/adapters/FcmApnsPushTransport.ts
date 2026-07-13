import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";

export class FcmApnsPushTransport implements PushPort {
  async send(_payload: PushPayload): Promise<PushResult> {
    return {
      ok: false,
      reason: "PERMANENT",
      cause: new Error(
        "FCM/APNS production transport is not configured in this build",
      ),
    };
  }
}
