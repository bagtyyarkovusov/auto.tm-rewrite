export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly deviceLabel: string | null;
  readonly userAgent: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly adminTotpExpiresAt: Date | null;
}
