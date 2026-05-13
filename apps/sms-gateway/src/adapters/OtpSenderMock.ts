import { randomUUID } from "node:crypto";

import type { OtpSenderPort, OtpSendRequest, OtpSendResult } from "../ports/OtpSenderPort.js";

export class OtpSenderMock implements OtpSenderPort {
  async send(_req: OtpSendRequest): Promise<OtpSendResult> {
    return { ok: true, messageId: randomUUID() };
  }
}
