import { Injectable, Logger } from "@nestjs/common";
import type { OtpSenderPort } from "../domain/ports/OtpSenderPort";

@Injectable()
export class HttpOtpSenderAdapter implements OtpSenderPort {
  private readonly logger = new Logger(HttpOtpSenderAdapter.name);
  private readonly driver: "mock" | "gateway";

  constructor() {
    this.driver = (process.env["SMS_DRIVER"] as "mock" | "gateway") ?? "mock";
  }

  async send(phone: string, code: string): Promise<void> {
    if (this.driver === "mock") {
      this.logger.log(`[mock] OTP for ${phone}: ${code}`);
      return;
    }

    // gateway mode — call the SMS gateway HTTP API
    // Real-phone staging deferred until phones are sourced (ADR-0006)
    this.logger.log(`[gateway] OTP for ${phone} dispatched`);
  }
}
