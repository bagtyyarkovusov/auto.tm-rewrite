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
 * records, so a log line carries only the last four digits of the phone and
 * nothing else derived from it. A hash would not do: beside the last four
 * digits, even a short digest picks one number out of the few thousand that
 * share them.
 */
function maskedPhone(phone: string): string {
  return `***${phone.slice(-4)}`;
}

/**
 * Tells two requests apart when their phones share the last four digits. It
 * is the start of the code request's own id, which the caller receives in the
 * response as `requestId`, so the mock-SMS runbook and
 * `staging-reviewer-flow-smoke.mjs signup-probe-request` can find their line.
 */
function requestTag(requestId: string): string {
  return requestId.slice(0, 8);
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
      this.logger.log(
        `[mock] OTP for ${maskedPhone(sms.phone)} (req ${requestTag(sms.requestId)}): ${sms.code}`,
      );
      return;
    }

    // gateway mode — the request below is what the SMS gateway takes. Posting
    // it waits for real-phone staging (ADR-0006), so this still only logs.
    const request = this.gatewayRequest(sms);
    this.logger.log(`[gateway] OTP for ${maskedPhone(request.phone)} dispatched`);
  }
}
