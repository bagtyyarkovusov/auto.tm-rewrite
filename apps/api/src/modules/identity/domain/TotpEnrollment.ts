export interface TotpEnrollment {
  readonly id: string;
  readonly userId: string;
  readonly encryptedSecret: string;
  readonly verifiedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
