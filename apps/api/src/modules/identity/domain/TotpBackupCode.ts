export interface TotpBackupCode {
  readonly id: string;
  readonly totpEnrollmentId: string;
  readonly codeHash: string;
  readonly usedAt: Date | null;
}
