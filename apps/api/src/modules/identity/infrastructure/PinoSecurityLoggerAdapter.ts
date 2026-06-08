import { Injectable, Logger } from "@nestjs/common";
import type { SecurityLoggerPort } from "../domain/ports/SecurityLoggerPort";

@Injectable()
export class PinoSecurityLoggerAdapter implements SecurityLoggerPort {
  private readonly logger = new Logger("Security");

  logAdminTotpFailure(userId: string, sessionId: string, reason: string): void {
    this.logger.warn({ userId, sessionId, reason }, "Admin TOTP verification failed");
  }
}
