import type { PushResult } from "../../domain/PushPort";
import { PUSH_RESULT_REASON } from "../../domain/types";

import type { ApnsMessage, ApnsSender } from "./ApnsSender";

/**
 * APNS side of `PUSH_TRANSPORT=fcm` (ADR-0047): the Android-first launch window
 * has no Apple credentials, so there is nothing to send with. Loads no SDK and
 * opens no connection.
 *
 * `PERMANENT`, deliberately not `INVALID_TOKEN`: a missing server credential is
 * no evidence that a device is dead, and `INVALID_TOKEN` deactivates the
 * `FcmDevice` row. Those rows must survive intact into the `fcm-apns` era.
 */
export class UnprovisionedApnsSender implements ApnsSender {
  async send(_message: ApnsMessage): Promise<PushResult> {
    return {
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: "APNS is not provisioned under PUSH_TRANSPORT=fcm",
    };
  }
}
