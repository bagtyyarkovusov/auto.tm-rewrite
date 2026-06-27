import type { TotpEnrollment } from "../TotpEnrollment";
import type { TotpBackupCode } from "../TotpBackupCode";

export interface TotpEnrollmentRepository {
  findByUserId(userId: string): Promise<TotpEnrollment | null>;

  createPending(userId: string, encryptedSecret: string): Promise<TotpEnrollment>;

  markVerified(userId: string): Promise<void>;

  addBackupCodes(enrollmentId: string, codeHashes: string[]): Promise<void>;

  findBackupCodes(enrollmentId: string): Promise<TotpBackupCode[]>;

  consumeBackupCode(enrollmentId: string, codeHash: string): Promise<boolean>;

  completeFirstVerification(input: {
    userId: string;
    enrollmentId: string;
    verifiedAt: Date;
    codeHashes: string[];
    sessionId: string;
    adminTotpExpiresAt: Date;
  }): Promise<void>;

  consumeBackupCodeAndElevate(input: {
    userId: string;
    enrollmentId: string;
    codeHash: string;
    usedAt: Date;
    sessionId: string;
    adminTotpExpiresAt: Date;
  }): Promise<boolean>;

  deleteByUserId(userId: string): Promise<void>;
}
