import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";
import { PUSH_PLATFORM } from "../domain/types";

import type { ApnsSender } from "./apns/ApnsSender";
import type { FcmSender } from "./fcm/FcmSender";

/** Data key carrying the S10 direct-message conversation deep link. */
export const DEEP_LINK_DATA_KEY = "deepLink";

/**
 * Production push transport. Routes `ios` device tokens to APNS and every other
 * platform to FCM, then returns the provider's classified result unchanged.
 * Delivery classification lives in the per-provider senders; this class only
 * routes and builds the wire payload.
 */
export class FcmApnsPushTransport implements PushPort {
  constructor(
    private readonly fcm: FcmSender,
    private readonly apns: ApnsSender,
  ) {}

  async send(payload: PushPayload): Promise<PushResult> {
    const message = {
      token: payload.deviceToken,
      title: payload.title,
      body: payload.body,
      data: buildDataPayload(payload),
    };

    return payload.platform === PUSH_PLATFORM.Ios
      ? this.apns.send(message)
      : this.fcm.send(message);
  }
}

/**
 * Both providers only carry string data values. The deep link is written last
 * so a job payload can never displace the S10 conversation deep-link contract.
 */
export function buildDataPayload(payload: PushPayload): Record<string, string> {
  const data: Record<string, string> = {};

  for (const [key, value] of Object.entries(payload.data)) {
    data[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  data[DEEP_LINK_DATA_KEY] = payload.deepLink;
  return data;
}
