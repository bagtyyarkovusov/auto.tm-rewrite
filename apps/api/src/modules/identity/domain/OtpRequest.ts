export interface OtpRequest {
  readonly id: string;
  readonly phone: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly verifiedAt: Date | null;
  readonly attempts: number;
  readonly userId: string | null;
  readonly ip: string;
  readonly createdAt: Date;
}
