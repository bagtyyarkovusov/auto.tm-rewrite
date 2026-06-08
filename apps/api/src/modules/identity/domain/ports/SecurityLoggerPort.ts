export interface SecurityLoggerPort {
  logAdminTotpFailure(userId: string, sessionId: string, reason: string): void;
}
