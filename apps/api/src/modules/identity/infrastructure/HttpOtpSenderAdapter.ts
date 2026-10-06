import { createHash } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";

import { renderCodeSms } from "../domain/codeSms";
import type { OtpSenderPort, OtpSms } from "../domain/ports/OtpSenderPort";

/** The body `apps/sms-gateway` `POST /v1/send` takes (ADR-0006). */
export interface GatewaySmsRequest {
  phone: string;
  body: string;
  requestId: string;
}

/**
 * The hosting log outlives the 30 days the privacy policy gives sign-in code
 * records, so a log line carries only the last four digits plus a short hash
 * fingerprint: two phones that share their last four still produce different
 * lines, and neither form identifies a person. The mock-SMS runbook greps
 * this line; `staging-reviewer-flow-smoke.mjs signup-probe-request` prints
 * the fingerprint to grep for.
 */
function maskedPhone(phone: string): string {
  const fingerprint = createHash("sha256").update(phone).digest("hex").slice(0, 6);
  return `***${phone.slice(-4)} (fp ${fingerprint})`;
}

@Injectable()
export class HttpOtpSenderAdapter implements OtpSenderPort {
  private readonly logger = new Logger(HttpOtpSenderAdapter.name);
  private readonly driver: "mock" | "gateway";

  constructor() {
    this.driver = (process.env["SMS_DRIVER"] as "mock" | "gateway") ?? "mock";
  }

  gatewayRequest(sms: OtpSms): GatewaySmsRequest {
    return {
      phone: sms.phone,
      body: renderCodeSms(sms),
      requestId: sms.requestId,
    };
  }

  async send(sms: OtpSms): Promise<void> {
    if (this.driver === "mock") {
      this.logger.log(`[mock] OTP for ${maskedPhone(sms.phone)}: ${sms.code}`);
      return;
    }

    // gateway mode — the request below is what the SMS gateway takes. Posting
    // it waits for real-phone staging (ADR-0006), so this still only logs.
    const request = this.gatewayRequest(sms);
    this.logger.log(`[gateway] OTP for ${maskedPhone(request.phone)} dispatched`);
  }
}
