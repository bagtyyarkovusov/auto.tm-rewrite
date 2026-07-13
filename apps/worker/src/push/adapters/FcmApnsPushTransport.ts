import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";
import { PUSH_RESULT_REASON } from "../domain/types";

export class FcmApnsPushTransport implements PushPort {
  async send(_payload: PushPayload): Promise<PushResult> {
    return {
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: new Error(
        "FCM/APNS production transport is not configured in this build",
      ),
    };
  }
}
